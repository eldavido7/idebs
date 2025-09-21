import { prisma } from "@/lib/prisma";
import { Discount } from "@/types";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { product: true, variant: true } },
                discount: true,
                shippingOption: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("[GET_ORDER]", error);
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const data = await request.json();
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            postalCode,
            country,
            status,
            items = [],
            discountId,
            shippingOptionId,
            shippingCost,
            paymentReference,
            subtotal: providedSubtotal,
            total: providedTotal,
        } = data;

        // Basic field validation (unchanged)
        if (
            (firstName !== undefined && !firstName) ||
            (lastName !== undefined && !lastName) ||
            (email !== undefined && !email) ||
            (phone !== undefined && !phone) ||
            (address !== undefined && !address) ||
            (city !== undefined && !city) ||
            (state !== undefined && !state) ||
            (postalCode !== undefined && !postalCode) ||
            (country !== undefined && !country)
        ) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (status && !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const existingOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true, discount: true, shippingOption: true },
        });

        if (!existingOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        let calculatedSubtotal = 0;
        let orderItems: { productId: string; variantId?: string; quantity: number; subtotal: number }[] = [];

        if (items.length > 0) {
            for (const item of items) {
                if (!item.productId || !item.quantity || item.quantity <= 0) {
                    return NextResponse.json({ error: "Invalid item format" }, { status: 400 });
                }

                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                });

                if (!product) {
                    return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
                }

                const variant = item.variantId
                    ? await prisma.productVariant.findUnique({
                        where: { id: item.variantId },
                    })
                    : null;

                if (item.variantId && !variant) {
                    return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 404 });
                }

                const unitPrice = variant?.price ?? product.price;
                if (unitPrice == null) {
                    return NextResponse.json({ error: "No valid price found for product/variant" }, { status: 400 });
                }

                const itemSubtotal = unitPrice * item.quantity;
                calculatedSubtotal += itemSubtotal;

                orderItems.push({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    subtotal: itemSubtotal,
                });
            }
        } else {
            calculatedSubtotal = existingOrder.items.reduce((acc, item) => acc + item.subtotal, 0);
        }

        if (providedSubtotal !== undefined && providedSubtotal !== calculatedSubtotal) {
            return NextResponse.json({ error: "Provided subtotal does not match calculated subtotal" }, { status: 400 });
        }

        let calculatedShippingCost = 0;
        let shippingOptionIdToUse = shippingOptionId !== undefined ? shippingOptionId : existingOrder.shippingOptionId;
        if (shippingOptionIdToUse) {
            const shippingOption = await prisma.shippingOption.findUnique({
                where: { id: shippingOptionIdToUse },
            });
            if (!shippingOption || shippingOption.status !== "ACTIVE") {
                return NextResponse.json({ error: "Invalid or inactive shipping option" }, { status: 400 });
            }
            calculatedShippingCost = shippingOption.price;
            if (shippingCost !== undefined && shippingCost !== calculatedShippingCost) {
                return NextResponse.json({ error: "Provided shipping cost does not match selected option" }, { status: 400 });
            }
        } else if (shippingCost !== undefined && shippingCost !== 0) {
            return NextResponse.json({ error: "Shipping cost provided without shipping option" }, { status: 400 });
        }

        // ---------- Discount handling (supports products AND variants) ----------
        let discount: Discount | null = null;
        let discountAmount = 0;
        let total = calculatedSubtotal + calculatedShippingCost;
        let discountIdToUse = discountId !== undefined ? discountId : existingOrder.discountId;

        if (discountIdToUse) {
            discount = await prisma.discount.findUnique({
                where: { id: discountIdToUse },
                include: { products: true, variants: true }, // <-- include variants
            });

            if (
                !discount ||
                !discount.isActive ||
                (discount.usageLimit && discount.usageCount >= discount.usageLimit) ||
                new Date() < discount.startsAt ||
                (discount.endsAt && new Date() > discount.endsAt)
            ) {
                return NextResponse.json({ error: "Invalid or inapplicable discount" }, { status: 400 });
            }

            if (discount.minSubtotal && calculatedSubtotal < discount.minSubtotal) {
                return NextResponse.json({ error: "Order subtotal below minimum for discount" }, { status: 400 });
            }

            // Build final items used for discount applicability (either updated items or existing items)
            const finalItemsForCheck: { productId: string; variantId?: string; subtotal: number }[] =
                items.length > 0
                    ? orderItems.map(it => ({ productId: it.productId, variantId: it.variantId, subtotal: it.subtotal }))
                    : existingOrder.items.map((it: any) => ({ productId: it.productId, variantId: (it as any).variantId ?? undefined, subtotal: it.subtotal }));

            const discountProductIds = (discount.products ?? []).map(p => p.id);
            const discountVariantIds = (discount.variants ?? []).map(v => v.id);

            let applicableSubtotal = 0;
            for (const it of finalItemsForCheck) {
                const matchesProduct = discountProductIds.length > 0 && discountProductIds.includes(it.productId);
                const matchesVariant = it.variantId && discountVariantIds.length > 0 && discountVariantIds.includes(it.variantId);
                if (discountProductIds.length === 0 && discountVariantIds.length === 0) {
                    // global discount
                    applicableSubtotal += it.subtotal;
                } else if (matchesProduct || matchesVariant) {
                    applicableSubtotal += it.subtotal;
                }
            }

            if ((discount.products?.length ?? 0) > 0 || (discount.variants?.length ?? 0) > 0) {
                if (applicableSubtotal === 0) {
                    return NextResponse.json({ error: "Discount not applicable to order items" }, { status: 400 });
                }
            }

            const baseForDiscount = ((discount.products?.length ?? 0) === 0 && (discount.variants?.length ?? 0) === 0)
                ? calculatedSubtotal
                : applicableSubtotal;

            if (discount.type === "percentage") {
                discountAmount = (discount.value / 100) * baseForDiscount;
            } else if (discount.type === "fixed_amount") {
                discountAmount = Math.min(discount.value, baseForDiscount);
            } else if (discount.type === "free_shipping") {
                if (baseForDiscount > 0) {
                    discountAmount = calculatedShippingCost;
                } else {
                    discountAmount = 0;
                }
            }

            total = Math.max(0, calculatedSubtotal + calculatedShippingCost - discountAmount);
        } else if (discountId === null) {
            total = calculatedSubtotal + calculatedShippingCost;
        }

        // ---------- end discount handling ----------

        if (providedTotal !== undefined && providedTotal !== total) {
            return NextResponse.json({ error: "Provided total does not match calculated total" }, { status: 400 });
        }

        if (paymentReference !== undefined && paymentReference !== existingOrder.paymentReference) {
            const existingOrderWithReference = await prisma.order.findFirst({
                where: { paymentReference },
            });
            if (existingOrderWithReference && existingOrderWithReference.id !== id) {
                return NextResponse.json({ error: "Payment reference already used" }, { status: 400 });
            }
        }

        // Begin transaction for updates + inventory changes
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // If items provided, replace them
            if (items.length > 0) {
                await tx.orderItem.deleteMany({ where: { orderId: id } });
                await Promise.all(
                    orderItems.map(item =>
                        tx.orderItem.create({
                            data: {
                                orderId: id,
                                productId: item.productId,
                                variantId: item.variantId ?? null,
                                quantity: item.quantity,
                                subtotal: item.subtotal,
                            },
                        })
                    )
                );
            }

            // Update discount usage if discount changed
            if (discount && discountId !== existingOrder.discountId) {
                await tx.discount.update({
                    where: { id: discount.id },
                    data: { usageCount: { increment: 1 } },
                });
            }

            // Determine status transitions
            const isBecomingShippedOrDelivered =
                (status === "SHIPPED" || status === "DELIVERED") &&
                existingOrder.status !== "SHIPPED" &&
                existingOrder.status !== "DELIVERED";

            const isLeavingShippedOrDelivered =
                (existingOrder.status === "SHIPPED" || existingOrder.status === "DELIVERED") &&
                status !== "SHIPPED" &&
                status !== "DELIVERED";

            // Final items: if updated, use orderItems (recently computed), else use existingOrder.items
            const finalItems = items.length > 0
                ? orderItems
                : existingOrder.items.map((it: any) => ({
                    productId: it.productId,
                    variantId: (it as any).variantId ?? undefined,
                    quantity: it.quantity,
                }));

            // Inventory operations (variant-aware, with product sync)
            if (isBecomingShippedOrDelivered) {
                // Deduct inventory
                for (const item of finalItems) {
                    if (item.variantId) {
                        await tx.productVariant.update({
                            where: { id: item.variantId },
                            data: { inventory: { decrement: item.quantity } },
                        });
                        // Sync parent product inventory to sum of variants
                        const sum = await tx.productVariant.aggregate({
                            where: { productId: item.productId },
                            _sum: { inventory: true },
                        });
                        const newSum = (sum._sum.inventory ?? 0);
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { inventory: newSum },
                        });
                    } else {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { inventory: { decrement: item.quantity } },
                        });
                    }
                }
            } else if (isLeavingShippedOrDelivered) {
                // Restore inventory
                for (const item of finalItems) {
                    if (item.variantId) {
                        await tx.productVariant.update({
                            where: { id: item.variantId },
                            data: { inventory: { increment: item.quantity } },
                        });
                        // Sync parent product inventory to sum of variants
                        const sum = await tx.productVariant.aggregate({
                            where: { productId: item.productId },
                            _sum: { inventory: true },
                        });
                        const newSum = (sum._sum.inventory ?? 0);
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { inventory: newSum },
                        });
                    } else {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { inventory: { increment: item.quantity } },
                        });
                    }
                }
            }

            // Update and return order
            return tx.order.update({
                where: { id },
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    postalCode,
                    country,
                    status,
                    subtotal: calculatedSubtotal,
                    shippingOptionId: shippingOptionIdToUse,
                    shippingCost: calculatedShippingCost,
                    total,
                    discountId: discountIdToUse,
                    paymentReference,
                },
                include: {
                    items: { include: { product: true, variant: true } },
                    discount: true,
                    shippingOption: true,
                },
            });
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error("[UPDATE_ORDER]", error);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}

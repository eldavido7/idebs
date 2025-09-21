import { prisma } from "@/lib/prisma";
import { Discount } from "@/types";
import { NextResponse } from "next/server";

// Get all orders
export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: {
                        product: true,
                        variant: true,
                    },
                },
                discount: true,
                shippingOption: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(orders);
    } catch (error) {
        console.error("[GET_ORDERS]", error);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}

// Create a new order
export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch (err) {
        console.error("[PARSE_JSON_ERROR]", err);
        return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    try {
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
            items,
            discountId,
            shippingOptionId,
            shippingCost,
            paymentReference,
            subtotal: providedSubtotal,
            total: providedTotal,
        } = body;

        if (!firstName || !lastName || !email || !phone || !address || !city || !state || !postalCode || !country) {
            return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Order must include at least one item" }, { status: 400 });
        }

        const orderItems: {
            product: { connect: { id: string } };
            variant?: { connect: { id: string } };
            quantity: number;
            subtotal: number;
        }[] = [];

        let calculatedSubtotal = 0;

        for (const item of items) {
            // require productId always for linking (variant must belong to product)
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                return NextResponse.json({ error: "Invalid item format" }, { status: 400 });
            }

            const product = await prisma.product.findUnique({
                where: { id: item.productId },
            });

            if (!product) {
                return NextResponse.json({ error: `Product with ID ${item.productId} not found` }, { status: 404 });
            }

            const variant = item.variantId
                ? await prisma.productVariant.findUnique({
                    where: { id: item.variantId },
                })
                : null;

            if (item.variantId && !variant) {
                return NextResponse.json({ error: `Variant with ID ${item.variantId} not found` }, { status: 404 });
            }

            // price fallback: variant.price -> product.price
            const unitPrice = variant?.price ?? product.price;
            if (unitPrice == null) {
                return NextResponse.json({ error: "No valid price found for product/variant" }, { status: 400 });
            }

            const itemSubtotal = unitPrice * item.quantity;
            calculatedSubtotal += itemSubtotal;

            orderItems.push({
                product: { connect: { id: product.id } },
                variant: item.variantId ? { connect: { id: item.variantId } } : undefined,
                quantity: item.quantity,
                subtotal: itemSubtotal,
            });
        }

        if (providedSubtotal !== calculatedSubtotal) {
            return NextResponse.json({ error: "Provided subtotal does not match calculated subtotal" }, { status: 400 });
        }

        let calculatedShippingCost = 0;
        if (shippingOptionId) {
            const shippingOption = await prisma.shippingOption.findUnique({
                where: { id: shippingOptionId },
            });
            if (!shippingOption || shippingOption.status !== "ACTIVE") {
                return NextResponse.json({ error: "Invalid or inactive shipping option" }, { status: 400 });
            }
            calculatedShippingCost = shippingOption.price;
            if (shippingCost !== calculatedShippingCost) {
                return NextResponse.json({ error: "Provided shipping cost does not match selected option" }, { status: 400 });
            }
        } else if (shippingCost !== 0) {
            return NextResponse.json({ error: "Shipping cost provided without shipping option" }, { status: 400 });
        }

        // ---------- Discount handling (supports products AND variants) ----------
        let discount: Discount | null = null;
        let discountAmount = 0;
        let total = calculatedSubtotal + calculatedShippingCost;

        if (discountId) {
            discount = await prisma.discount.findUnique({
                where: { id: discountId },
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

            // Determine applicable subtotal (only items the discount applies to)
            const discountProductIds = (discount.products ?? []).map(p => p.id);
            const discountVariantIds = (discount.variants ?? []).map(v => v.id);

            // orderItems aligns with items[] order — use that mapping to sum subtotals for applicable items
            let applicableSubtotal = 0;
            for (let i = 0; i < items.length; i++) {
                const raw = items[i];
                const built = orderItems[i];
                const matchesProduct = discountProductIds.length > 0 && discountProductIds.includes(raw.productId);
                const matchesVariant = raw.variantId && discountVariantIds.length > 0 && discountVariantIds.includes(raw.variantId);
                if (discountProductIds.length === 0 && discountVariantIds.length === 0) {
                    // global discount -> everything applicable
                    applicableSubtotal += built.subtotal;
                } else if (matchesProduct || matchesVariant) {
                    applicableSubtotal += built.subtotal;
                }
            }

            if ((discount.products?.length ?? 0) > 0 || (discount.variants?.length ?? 0) > 0) {
                if (applicableSubtotal === 0) {
                    return NextResponse.json({ error: "Discount not applicable to order items" }, { status: 400 });
                }
            }

            // Calculate discount amount using applicableSubtotal (or whole subtotal for global)
            const baseForDiscount = ((discount.products?.length ?? 0) === 0 && (discount.variants?.length ?? 0) === 0)
                ? calculatedSubtotal
                : applicableSubtotal;

            if (discount.type === "percentage") {
                discountAmount = (discount.value / 100) * baseForDiscount;
            } else if (discount.type === "fixed_amount") {
                // cap the fixed discount to the applicable amount so total doesn't go negative for those items
                discountAmount = Math.min(discount.value, baseForDiscount);
            } else if (discount.type === "free_shipping") {
                // free shipping applies if it is a global discount or applies to at least one item
                if (baseForDiscount > 0) {
                    discountAmount = calculatedShippingCost;
                } else {
                    discountAmount = 0;
                }
            }

            total = Math.max(0, calculatedSubtotal + calculatedShippingCost - discountAmount);
        }

        // ---------- end discount handling ----------

        if (providedTotal !== total) {
            return NextResponse.json({ error: "Provided total does not match calculated total" }, { status: 400 });
        }

        if (paymentReference) {
            const existingOrder = await prisma.order.findFirst({
                where: { paymentReference },
            });
            if (existingOrder) {
                return NextResponse.json({ error: "Payment reference already used" }, { status: 400 });
            }
        }

        // Create order inside transaction (no inventory change on create — inventory changes occur on status transitions)
        const order = await prisma.$transaction(async (tx) => {
            const createdOrder = await tx.order.create({
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
                    status: "PENDING",
                    subtotal: calculatedSubtotal,
                    shippingOption: shippingOptionId
                        ? { connect: { id: shippingOptionId } }
                        : undefined,
                    shippingCost: calculatedShippingCost,
                    total,
                    discount: discount ? { connect: { id: discount.id } } : undefined,
                    paymentReference,
                    items: { create: orderItems },
                },
                include: {
                    items: { include: { product: true, variant: true } },
                    discount: true,
                    shippingOption: true,
                },
            });

            if (discount) {
                await tx.discount.update({
                    where: { id: discount.id },
                    data: { usageCount: { increment: 1 } },
                });
            }

            return createdOrder;
        }, { timeout: 15000 });

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("[CREATE_ORDER]", error?.message ?? error);
        if (error?.code) console.error("Prisma Error Code:", error.code);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}

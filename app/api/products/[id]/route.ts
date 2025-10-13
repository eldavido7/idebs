import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductVariant } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url: string): string | null => {
    if (!url.includes("res.cloudinary.com")) return null;
    const parts = url.split("/upload/")[1]?.split(".")[0];
    return parts ? parts.split("/").slice(1).join("/") : null;
};

// PUT: Update product by ID
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const body = await req.json();
        const params = await context.params;
        const { id } = params;

        const {
            title,
            description,
            price,
            inventory,
            category,
            subcategory,
            tags,
            barcode,
            imageUrl,
            imagePublicId,
            variants,
        } = body;

        const existingProduct = await prisma.product.findUnique({ where: { id } });
        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const updated = await prisma.product.update({
            where: { id },
            data: {
                title,
                description,
                price,
                inventory,
                category,
                subcategory,
                tags,
                barcode,
                imageUrl: imageUrl ?? existingProduct.imageUrl,
                imagePublicId: imagePublicId ?? existingProduct.imagePublicId,
                ...(variants
                    ? {
                        variants: {
                            deleteMany: {}, // remove all old variants
                            create: variants.map((v: ProductVariant) => ({
                                name: v.name,
                                sku: v.sku,
                                price: v.price,
                                inventory: v.inventory,
                            })),
                        },
                    }
                    : {}),
            },
            include: { variants: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

// DELETE: Delete product by ID
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const { id } = params;

        // Fetch product to get media fields
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                orderItems: {
                    include: {
                        order: {
                            select: {
                                status: true
                            }
                        }
                    }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Check if product is in any non-shipped/non-delivered orders
        const hasActiveOrders = product.orderItems.some(
            item => !["SHIPPED", "DELIVERED", "CANCELLED"].includes(item.order.status)
        );

        if (hasActiveOrders) {
            return NextResponse.json({
                error: "Cannot delete product. It is part of pending or processing orders."
            }, { status: 400 });
        }

        // Delete image from Cloudinary if it exists
        if (product.imagePublicId || product.imageUrl) {
            const publicId = product.imagePublicId || getPublicIdFromUrl(product.imageUrl ?? "");
            if (publicId && product.imageUrl?.includes("res.cloudinary.com")) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
                    console.log(`[DELETE_PRODUCT_MEDIA] Deleted image: ${publicId}`);
                } catch (error) {
                    console.error(`[DELETE_PRODUCT_MEDIA] Failed to delete image ${publicId}:`, error);
                    // Continue with deletion even if Cloudinary fails
                }
            }
        }

        // Delete product from database (will cascade delete variants and orderItems)
        await prisma.product.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("[DELETE_PRODUCT]", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
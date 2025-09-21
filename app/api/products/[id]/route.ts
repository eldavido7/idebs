import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductVariant } from "@prisma/client";

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

        await prisma.product.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Product deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}

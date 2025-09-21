import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
    try {
        // 1️⃣ Try product-level barcode match
        let product = await prisma.product.findFirst({
            where: { barcode: params.code },
            include: { variants: true },
        });

        // 2️⃣ If not found, try variant SKU match
        if (!product) {
            const variant = await prisma.productVariant.findFirst({
                where: { sku: params.code },
                include: { product: true },
            });

            if (!variant) {
                return NextResponse.json({ error: "Product not found" }, { status: 404 });
            }

            // Return product + mark which variant matched
            product = await prisma.product.findUnique({
                where: { id: variant.productId },
                include: { variants: true },
            });

            return NextResponse.json({
                ...product,
                matchedVariant: variant,
            });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
}

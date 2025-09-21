import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ProductVariant } from "@prisma/client";

// GET - Fetch all products
export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
            include: { variants: true },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("[GET_PRODUCTS]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

// POST - Create new product
export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body || typeof body !== "object") {
            return new NextResponse("Invalid request payload", { status: 400 });
        }

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

        // Validate required base fields
        if (!title || !description || !category) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const hasVariants = variants && variants.length > 0;

        // If no variants, require price + inventory
        if (!hasVariants) {
            if (price == null || price <= 0) {
                return new NextResponse("Price is required if no variants are provided", { status: 400 });
            }
            if (inventory == null || inventory < 0) {
                return new NextResponse("Inventory is required if no variants are provided", { status: 400 });
            }
        }

        // If variants exist, validate their data
        if (hasVariants) {
            const seenSKUs = new Set();
            for (const v of variants) {
                if (!v.name) {
                    return new NextResponse("Variant name is required", { status: 400 });
                }
                if (v.price == null || v.price <= 0) {
                    return new NextResponse("Variant price must be greater than 0", { status: 400 });
                }
                if (v.inventory == null || v.inventory < 0) {
                    return new NextResponse("Variant inventory is required", { status: 400 });
                }
                if (v.sku) {
                    if (seenSKUs.has(v.sku)) {
                        return new NextResponse("Duplicate SKUs are not allowed", { status: 400 });
                    }
                    seenSKUs.add(v.sku);
                }
            }
        }

        // Generate a unique barcode if not provided
        let finalBarcode = barcode || crypto.randomUUID().slice(0, 6);
        let existing = await prisma.product.findUnique({
            where: { barcode: finalBarcode },
        });

        while (existing) {
            finalBarcode = crypto.randomUUID().slice(0, 6);
            existing = await prisma.product.findUnique({
                where: { barcode: finalBarcode },
            });
        }

        const newProduct = await prisma.product.create({
            data: {
                title,
                description,
                category,
                subcategory,
                tags,
                barcode: finalBarcode,
                imageUrl,
                imagePublicId,
                // Only set price + inventory if no variants
                ...(hasVariants
                    ? {}
                    : {
                        price,
                        inventory,
                    }),
                ...(hasVariants
                    ? {
                        variants: {
                            create: variants.map((v: ProductVariant) => ({
                                name: v.name,
                                sku: v.sku || null,
                                price: v.price,
                                inventory: v.inventory,
                            })),
                        },
                    }
                    : {}),
            },
            include: { variants: true },
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        console.error("[CREATE_PRODUCT]", error);
        return new NextResponse(error.message || "Error creating product", {
            status: 500,
        });
    }
}

// PUT - Update a product
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params; // Get id from URL
        const body = await req.json();
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

        // Validate required fields
        if (!id || !title || !description || !category) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const existingProduct = await prisma.product.findUnique({ where: { id } });
        if (!existingProduct) {
            return new NextResponse("Product not found", { status: 404 });
        }

        const updatedProduct = await prisma.product.update({
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
                            deleteMany: {}, // replace all variants
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

        return NextResponse.json(updatedProduct);
    } catch (error: any) {
        console.error("[UPDATE_PRODUCT]", error);
        return new NextResponse(error.message || "Error updating product", {
            status: 500,
        });
    }
}

// DELETE - Delete a product
// export async function DELETE(req: Request) {
//     try {
//         const { id } = await req.json();

//         await prisma.product.delete({
//             where: { id },
//         });

//         return new NextResponse("Product deleted successfully");
//     } catch (error: any) {
//         console.error("[DELETE_PRODUCT]", error);
//         return new NextResponse(error.message || "Error deleting product", {
//             status: 500,
//         });
//     }
// }

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, barcode } = body;

        if (!id || !barcode) {
            return new NextResponse("Product ID and barcode are required", {
                status: 400,
            });
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                barcode,
            },
            include: { variants: true },
        });

        return NextResponse.json(updatedProduct);
    } catch (error: any) {
        console.error("[UPDATE_BARCODE]", error);
        return new NextResponse(error.message || "Error updating barcode", {
            status: 500,
        });
    }
}

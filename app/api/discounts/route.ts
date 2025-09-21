import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all discounts
export async function GET() {
    try {
        const discounts = await prisma.discount.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                products: true,
                variants: true, // 👈 include related variants
            },
        });
        return NextResponse.json(discounts);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
    }
}

// CREATE a new discount
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            code,
            description,
            type,
            value,
            usageLimit,
            startsAt,
            endsAt,
            isActive,
            minSubtotal,
            productIds, // array of product IDs
            variantIds, // array of variant IDs
        } = body;

        // Validate required fields
        if (!code || !type || !value || !startsAt || isActive === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newDiscount = await prisma.discount.create({
            data: {
                code,
                description,
                type,
                value,
                usageLimit,
                usageCount: 0,
                startsAt: new Date(startsAt),
                endsAt: endsAt ? new Date(endsAt) : undefined,
                isActive,
                minSubtotal,
                products: productIds?.length
                    ? { connect: productIds.map((id: string) => ({ id })) }
                    : undefined,
                variants: variantIds?.length
                    ? { connect: variantIds.map((id: string) => ({ id })) }
                    : undefined,
            },
            include: {
                products: true,
                variants: true,
            },
        });

        return NextResponse.json(newDiscount, { status: 201 });
    } catch (error) {
        console.error("[DISCOUNT_POST]", error);
        return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
    }
}

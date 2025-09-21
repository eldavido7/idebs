import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all shipping options
export async function GET() {
    try {
        const options = await prisma.shippingOption.findMany();
        return NextResponse.json(options);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch shipping options." }, { status: 500 });
    }
}

// POST create shipping option
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, price, deliveryTime, status } = body;

        if (!name || price == null || !deliveryTime) {
            return NextResponse.json({ error: "Missing fields." }, { status: 400 });
        }

        const shipping = await prisma.shippingOption.create({
            data: {
                name,
                price,
                deliveryTime,
                status,
            },
        });

        return NextResponse.json(shipping);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create shipping option." }, { status: 500 });
    }
}

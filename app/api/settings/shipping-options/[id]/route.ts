import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH update shipping option
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const body = await req.json();
        const params = await context.params
        const { id } = params
        const { name, price, deliveryTime, status } = body;

        const updatedShipping = await prisma.shippingOption.update({
            where: { id },
            data: {
                name,
                price,
                deliveryTime,
                status,
            },
        });

        return NextResponse.json(updatedShipping);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update shipping option." }, { status: 500 });
    }
}

// DELETE shipping option
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params
        const { id } = params

        await prisma.shippingOption.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete shipping option." }, { status: 500 });
    }
}

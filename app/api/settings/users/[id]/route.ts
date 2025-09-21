import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// PATCH update user
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const body = await req.json();
        const params = await context.params
        const { id } = params

        const { name, email, password } = body;
        const hashedPassword = await bcrypt.hash(password, 10);


        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                name,
                email,
                password: hashedPassword,
                lastActive: new Date().toISOString(),
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }
}

// DELETE user
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params
        const { id } = params

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
    }
}

// lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function requireRole(req: NextRequest, allowedRoles: string[]) {
    // Get user from session/token (implement based on your auth system)
    const userId = req.headers.get('user-id'); // Adjust based on your auth implementation

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!user || !allowedRoles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null; // No error, proceed
}
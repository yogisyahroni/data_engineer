import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: workspaceId } = await params;

        // Verify membership
        const membership = await db.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: session.user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const theme = await db.theme.findUnique({
            where: { workspaceId },
        });

        // Return default if no theme set
        if (!theme) {
            return NextResponse.json({
                primaryColor: "#7c3aed",
                radius: 0.5,
                fontFamily: "Inter",
                chartPalette: null,
                darkMode: false
            });
        }

        return NextResponse.json(theme);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: workspaceId } = await params;
        const body = await req.json();
        const { primaryColor, radius, fontFamily, chartPalette, darkMode } = body;

        // Verify Admin/Owner role
        const membership = await db.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: session.user.id,
                },
            },
        });

        if (!membership || !['ADMIN', 'OWNER'].includes(membership.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const theme = await db.theme.upsert({
            where: { workspaceId },
            create: {
                workspaceId,
                primaryColor,
                radius,
                fontFamily,
                chartPalette,
                darkMode
            },
            update: {
                primaryColor,
                radius,
                fontFamily,
                chartPalette,
                darkMode
            },
        });

        return NextResponse.json(theme);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

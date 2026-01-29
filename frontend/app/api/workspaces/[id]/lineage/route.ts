import { NextRequest, NextResponse } from "next/server";
import { lineageService } from "@/lib/lineage/lineage-service";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const graph = await lineageService.buildGraph(params.id);
        return NextResponse.json(graph);
    } catch (error: any) {
        console.error("[Lineage API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

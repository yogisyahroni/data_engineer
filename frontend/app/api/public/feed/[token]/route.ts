
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queryService } from '@/lib/services/query-service';
import { Parser } from '@json2csv/plainjs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        // 1. Validate Token
        const feed = await db.queryFeed.findUnique({
            where: { token },
            include: {
                query: true
            }
        });

        if (!feed || !feed.isEnabled) {
            return NextResponse.json({ error: "Feed not found or disabled" }, { status: 404 });
        }

        if (feed.expiresAt && new Date() > feed.expiresAt) {
            return NextResponse.json({ error: "Feed token expired" }, { status: 410 });
        }

        // 2. Update Access Stats (Async - fire and forget)
        db.queryFeed.update({
            where: { id: feed.id },
            data: { lastAccessedAt: new Date() }
        }).catch(console.error);

        // 3. Prepare Security Context (Impersonate Creator)
        // We assume the creator's permissions apply to this feed.
        // This allows sharing data without exposing the user's login.
        const securityContext = {
            userId: feed.createdBy,
            tenantId: 'system', // MVP: Default tenant
            role: 'viewer' as const
        };

        // 4. Execute Query
        // Use the saved query's SQL and connection
        const result = await queryService.executeRawQuery(
            feed.query.connectionId,
            feed.query.sql,
            securityContext
        );

        if (!result.success) {
            return NextResponse.json({ error: "Execution failed", details: result.error }, { status: 500 });
        }

        // 5. Format Response
        const data = result.data;

        // JSON Format
        if (feed.format === 'json') {
            return NextResponse.json(data);
        }

        // CSV Format (Default)
        if (!data || data.length === 0) {
            return new NextResponse("", {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${feed.name || 'query_results'}.csv"`
                }
            });
        }

        try {
            const parser = new Parser();
            const csv = parser.parse(data);

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${feed.name || 'query_results'}.csv"`
                }
            });
        } catch (err) {
            console.error("CSV Parsing Error:", err);
            return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("[Feed API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

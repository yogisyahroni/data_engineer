import { type NextRequest, NextResponse } from 'next/server';
import { connectionService } from '@/lib/services/connection-service';
import { CreateConnectionSchema } from '@/lib/schemas/connection';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // TODO: Replace with real Auth check (Phase 2) using NextAuth/Clerk
    // Protocol 4: Network Hostility - We must eventually validate this token.
    if (!userId || userId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing User ID' },
        { status: 401 }
      );
    }

    const connections = await connectionService.getConnections(userId);

    return NextResponse.json({
      success: true,
      data: connections,
      count: connections.length,
    });
  } catch (error) {
    console.error('[API] Error fetching connections:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Protocol 2.3: Validate Input
    const validatedData = CreateConnectionSchema.parse(rawBody);

    // TODO: Get from Auth Context (Phase 2)
    const userId = validatedData.userId || 'user_123';

    const newConnection = await connectionService.createConnection(userId, validatedData);

    console.log('[API] Connection created:', newConnection.id);

    return NextResponse.json({
      success: true,
      data: newConnection,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[API] Error creating connection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

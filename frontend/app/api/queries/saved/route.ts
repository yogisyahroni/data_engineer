import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const SaveQuerySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sql: z.string().min(1, "SQL is required"),
  aiPrompt: z.string().optional(),
  connectionId: z.string().min(1, "Connection ID is required"),
  collectionId: z.string().optional(), // Optional, defaults to 'Default'
  visualizationConfig: z.any().optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
  userId: z.string().optional(), // For demo/dev override
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'user_123'; // Default dev user
    const collectionId = searchParams.get('collectionId');
    const search = searchParams.get('search');

    const where: any = {
      userId,
    };

    if (collectionId) {
      where.collectionId = collectionId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } } // Note: Check Prisma support for array contains
      ];
    }

    const queries = await db.savedQuery.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        connection: {
          select: { name: true, type: true }
        }
      }
    });

    // Map tags manually if needed, but Prisma handles string[] natively in Postgres
    // Returns queries as is

    return NextResponse.json({
      success: true,
      data: queries,
      count: queries.length,
    });
  } catch (error) {
    console.error('[API] Error fetching saved queries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved queries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const validatedData = SaveQuerySchema.parse(rawBody);

    const userId = validatedData.userId || 'user_123'; // Default to dev user

    // 1. Handle Collection: Use provided ID or find/create "Default"
    let collectionId = validatedData.collectionId;

    if (!collectionId) {
      // Try to find a 'Default' collection for this user
      let defaultCollection = await db.collection.findFirst({
        where: { userId, name: 'Default' }
      });

      if (!defaultCollection) {
        // Create one if it doesn't exist
        // Note: Assuming 'user_123' exists in User table. If not, this might fail on relation.
        // In a real app, we'd ensure User exists on signup.
        // For resilience, we check if user exists, if not create 'user_123' (Hack for dev)
        const userExists = await db.user.findUnique({ where: { id: userId } });
        if (!userExists) {
          console.warn(`[API] User ${userId} not found. Creating placeholder user.`);
          // This is purely for local dev convenience to prevent FK errors
          await db.user.create({
            data: {
              id: userId,
              email: 'demo@example.com',
              name: 'Demo User',
              password: 'hashed_placeholder'
            }
          });
        }

        defaultCollection = await db.collection.create({
          data: {
            name: 'Default',
            description: 'Default collection for saved queries',
            userId
          }
        });
      }
      collectionId = defaultCollection.id;
    }

    // 2. Save Query
    const newQuery = await db.savedQuery.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        sql: validatedData.sql,
        aiPrompt: validatedData.aiPrompt,
        connectionId: validatedData.connectionId,
        collectionId: collectionId!,
        userId,
        visualizationConfig: validatedData.visualizationConfig ?? {},
        tags: validatedData.tags || [],
        pinned: validatedData.pinned || false
      }
    });

    console.log('[API] Query saved:', newQuery.id);

    return NextResponse.json({
      success: true,
      data: newQuery,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[API] Error saving query:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

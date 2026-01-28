import { type NextRequest, NextResponse } from 'next/server';
import { collectionRepo } from '@/lib/repositories/collection-repo';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // In a real auth scenario, we would get the userId from the session
    // For now, we fallback to 'user-1' if not provided, or strictly require it
    // Let's use 'user-1' as the default for this dev phase
    const effectiveUserId = userId || 'user-1';

    const collections = await collectionRepo.findAllByUserId(effectiveUserId);

    return NextResponse.json({
      success: true,
      data: collections,
      count: collections.length,
    });
  } catch (error) {
    console.error('[API] Error fetching collections:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Default to 'user-1' for now
    const userId = 'user-1';

    const newCollection = await collectionRepo.create({
      name: body.name,
      description: body.description,
      icon: body.icon,
      parentId: body.parentId,
      // @ts-ignore: isPublic added to schema but client not yet regenerated
      isPublic: body.isPublic || false,
      userId: userId
    });

    return NextResponse.json({
      success: true,
      data: newCollection,
    });
  } catch (error) {
    console.error('[API] Error creating collection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

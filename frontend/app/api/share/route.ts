import { type NextRequest, NextResponse } from 'next/server';
import { type SharedQuery, type SharedDashboard } from '@/lib/types';

interface ShareQueryRequest {
  queryId: string;
  sharedWith: string;
  permission: 'view' | 'edit' | 'admin';
  expiresIn?: number; // in days
}

interface ShareDashboardRequest {
  dashboardId: string;
  sharedWith: string;
  permission: 'view' | 'edit' | 'admin';
  expiresIn?: number; // in days
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const resourceType = url.searchParams.get('type');

    if (resourceType === 'query') {
      const body = (await request.json()) as ShareQueryRequest;
      const { queryId, sharedWith, permission, expiresIn } = body;

      if (!queryId || !sharedWith || !permission) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // TODO: Save share record to database
      const sharedQuery: SharedQuery = {
        id: `share_${Date.now()}`,
        queryId,
        sharedBy: 'current_user', // TODO: Get from auth
        sharedWith,
        permission,
        createdAt: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : undefined,
      };

      console.log('[v0] Query shared:', {
        queryId,
        sharedWith,
        permission,
      });

      return NextResponse.json({
        success: true,
        data: sharedQuery,
      });
    } else if (resourceType === 'dashboard') {
      const body = (await request.json()) as ShareDashboardRequest;
      const { dashboardId, sharedWith, permission, expiresIn } = body;

      if (!dashboardId || !sharedWith || !permission) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // TODO: Save share record to database
      const sharedDashboard: SharedDashboard = {
        id: `share_${Date.now()}`,
        dashboardId,
        sharedBy: 'current_user', // TODO: Get from auth
        sharedWith,
        permission,
        createdAt: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : undefined,
      };

      console.log('[v0] Dashboard shared:', {
        dashboardId,
        sharedWith,
        permission,
      });

      return NextResponse.json({
        success: true,
        data: sharedDashboard,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid resource type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[v0] Error sharing resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to share resource' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get('type');
    const resourceId = searchParams.get('id');

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { success: false, error: 'Missing type or id parameter' },
        { status: 400 }
      );
    }

    // TODO: Fetch shares from database
    const mockShares: (SharedQuery | SharedDashboard)[] = [];

    console.log('[v0] Fetched shares for:', {
      resourceType,
      resourceId,
    });

    return NextResponse.json({
      success: true,
      data: mockShares,
      count: mockShares.length,
    });
  } catch (error) {
    console.error('[v0] Error fetching shares:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { shareId: string };
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { success: false, error: 'shareId is required' },
        { status: 400 }
      );
    }

    // TODO: Delete share from database
    console.log('[v0] Share deleted:', shareId);

    return NextResponse.json({
      success: true,
      message: 'Share removed successfully',
    });
  } catch (error) {
    console.error('[v0] Error deleting share:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete share' },
      { status: 500 }
    );
  }
}

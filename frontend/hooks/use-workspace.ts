'use client';

import { useParams } from 'next/navigation';

export function useWorkspace() {
    const params = useParams();
    // Return workspaceId from URL or default to 'default' for now
    // In a real app, this would use a React Context or Zustand store
    const workspaceId = (params?.workspaceId as string) || 'default';

    return {
        workspaceId,
        // Mock permission check for now
        role: 'OWNER'
    };
}

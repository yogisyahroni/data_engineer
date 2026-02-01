// Batch 3: Collaboration & Metadata Types

// Collections
export interface Collection {
    id: string;
    name: string;
    description?: string;
    userId: string;
    workspaceId?: string;
    createdAt: string;
    updatedAt: string;
    items?: CollectionItem[];
}

export interface CollectionItem {
    id: string;
    collectionId: string;
    itemType: 'pipeline' | 'dataflow';
    itemId: string;
    createdAt: string;
}

export interface CreateCollectionRequest {
    name: string;
    description?: string;
    workspaceId?: string;
}

// Comments
export interface Comment {
    id: string;
    entityType: 'pipeline' | 'dataflow' | 'collection';
    entityId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommentRequest {
    entityType: 'pipeline' | 'dataflow' | 'collection';
    entityId: string;
    content: string;
}

// Apps & Canvas
export interface App {
    id: string;
    name: string;
    description?: string;
    userId: string;
    workspaceId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Canvas {
    id: string;
    appId: string;
    name: string;
    config?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface Widget {
    id: string;
    canvasId: string;
    type: 'chart' | 'table' | 'metric';
    config: Record<string, any>;
    position?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    createdAt: string;
    updatedAt: string;
}

// Workspaces
export interface Workspace {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    createdAt: string;
}

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
}

export interface InviteMemberRequest {
    email: string;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

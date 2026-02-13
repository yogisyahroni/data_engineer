// Comments & Annotations TypeScript Types
// Task: TASK-093, TASK-094

// User reference in comments
export interface CommentUser {
    id: string;
    name: string;
    email: string;
    username?: string;
    image?: string;
    avatar?: string;
}

// Mention in comment content
export interface Mention {
    username: string;
    userId: string;
    position: number;
}

// Annotation position data
export interface AnnotationPosition {
    x: number;
    y: number;
}

// Chart annotation
export interface Annotation {
    id: string;
    commentId: string;
    chartId: string;
    xValue?: number;
    yValue?: number;
    xCategory?: string;
    yCategory?: string;
    position: AnnotationPosition;
    type: 'point' | 'range' | 'text';
    color: string;
    createdAt: string;
    updatedAt: string;
}

// Comment entity types
export type CommentEntityType =
    | 'dashboard'
    | 'query'
    | 'chart'
    | 'pipeline'
    | 'dataflow'
    | 'collection'
    | 'card';

// Base comment interface
export interface Comment {
    id: string;
    entityType: CommentEntityType;
    entityId: string;
    userId: string;
    content: string;
    parentId?: string;
    isResolved: boolean;
    mentions: string[];
    createdAt: string;
    updatedAt: string;

    // Relationships
    user?: CommentUser;
    parent?: Comment;
    replies?: Comment[];
    annotation?: Annotation;
}

// Extended comment with computed fields
export interface CommentWithDetails extends Comment {
    replyCount: number;
    mentionedUsers?: CommentUser[];
}

// Request types
export interface CreateCommentRequest {
    entityType: CommentEntityType;
    entityId: string;
    content: string;
    parentId?: string;
}

export interface UpdateCommentRequest {
    content: string;
}

export interface ResolveCommentRequest {
    isResolved: boolean;
}

// Filter options for listing comments
export interface CommentFilter {
    entityType?: CommentEntityType;
    entityId?: string;
    userId?: string;
    parentId?: string; // '' for root, '*' for all, or specific ID
    isResolved?: boolean;
    sortBy?: 'date' | 'popular';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// Response types
export interface CommentsResponse {
    comments: Comment[];
    total: number;
    limit: number;
    offset: number;
}

// Annotation request types
export interface CreateAnnotationRequest {
    chartId: string;
    xValue?: number;
    yValue?: number;
    xCategory?: string;
    yCategory?: string;
    position: AnnotationPosition;
    type: 'point' | 'range' | 'text';
    color?: string;
    content: string;
}

export interface UpdateAnnotationRequest extends CreateAnnotationRequest { }

// Mention search types
export interface MentionSearchResult {
    users: CommentUser[];
}

// Comment list view modes
export type CommentSortOption = 'newest' | 'oldest' | 'popular';
export type CommentFilterOption = 'all' | 'resolved' | 'unresolved';

// Comment input state
export interface CommentInputState {
    content: string;
    isSubmitting: boolean;
    showMentions: boolean;
    mentionQuery: string;
    mentionPosition: number;
}

// Thread state
export interface ThreadState {
    isExpanded: boolean;
    isReplying: boolean;
    showReplies: boolean;
}

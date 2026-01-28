/**
 * Standardized API Response Wrapper
 * All API routes should return responses in this format
 */

// Base API Response
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ApiMeta;
}

// Error structure
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// Pagination & metadata
export interface ApiMeta {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    executionTime?: number;
}

// Paginated response helper
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: ApiMeta & {
        page: number;
        limit: number;
        total: number;
    };
}

// Common error codes
export const API_ERROR_CODES = {
    // Client errors
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',

    // Server errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    QUERY_ERROR: 'QUERY_ERROR',
    AI_ERROR: 'AI_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// Helper to create success response
export function successResponse<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
    return {
        success: true,
        data,
        meta,
    };
}

// Helper to create error response
export function errorResponse(
    code: ApiErrorCode,
    message: string,
    details?: Record<string, unknown>
): ApiResponse<never> {
    return {
        success: false,
        error: { code, message, details },
    };
}

// Helper to create paginated response
export function paginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
): PaginatedResponse<T> {
    return {
        success: true,
        data,
        meta: {
            page,
            limit,
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    };
}

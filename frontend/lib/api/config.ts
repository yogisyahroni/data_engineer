/**
 * API Configuration
 * 
 * Centralized API configuration for environment-aware requests
 * and consistent authentication headers.
 */

import { logger } from '../logger'

// ============================================================================
// Configuration
// ============================================================================

/**
 * API base URL - configurable via environment variable
 * Defaults to localhost:8080 for development
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Get authentication headers for API requests
 * Retrieves JWT token from localStorage and formats Authorization header
 * 
 * @returns Headers object with Authorization token if available
 */
export function getAuthHeaders(): HeadersInit {
    // Check if we're in browser environment
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null

    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    }
}

// ============================================================================
// Generic API Request Wrapper
// ============================================================================

/**
 * Generic API request wrapper with error handling and logging
 * 
 * @param endpoint API endpoint (e.g., '/api/roles')
 * @param options Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if request fails
 */
export async function apiRequest<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options?.headers
            }
        })

        // Handle non-OK responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`

            logger.warn('api_request_failed', errorMessage, {
                endpoint,
                status: response.status,
                method: options?.method || 'GET'
            })

            throw new Error(errorMessage)
        }

        const data = await response.json()
        return data as T

    } catch (error) {
        // Re-throw with additional context
        if (error instanceof Error) {
            throw error
        }
        throw new Error('Unknown API error occurred')
    }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'GET' })
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    })
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    })
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'DELETE' })
}

/**
 * Structured Logging Utility for Frontend
 * 
 * COMPLIANCE: GEMINI.md Section 15 - Operational Maturity
 * - Structured JSON logging
 * - No console.log/error/warn in production code
 * - Environment-aware behavior
 * 
 * USAGE:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('user_login', 'User logged in successfully', { userId: user.id });
 * logger.error('api_call_failed', 'Failed to fetch data', { error: err, endpoint: '/api/users' });
 * ```
 */

interface LogMetadata {
    [key: string]: any;
}

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    operation: string;
    message: string;
    metadata?: LogMetadata;
    userAgent?: string;
    url?: string;
}

class Logger {
    private isDevelopment: boolean;
    private isProduction: boolean;
    private backendEndpoint = '/api/logs/frontend';

    constructor() {
        // Environment detection
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    /**
     * Log DEBUG level message
     * Only logged in development mode
     */
    debug(operation: string, message: string, metadata?: LogMetadata): void {
        if (!this.isDevelopment) return; // Skip in production
        this.log(LogLevel.DEBUG, operation, message, metadata);
    }

    /**
     * Log INFO level message
     */
    info(operation: string, message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.INFO, operation, message, metadata);
    }

    /**
     * Log WARN level message
     */
    warn(operation: string, message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.WARN, operation, message, metadata);
    }

    /**
     * Log ERROR level message
     */
    error(operation: string, message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.ERROR, operation, message, metadata);
    }

    /**
     * Internal log method
     */
    private log(
        level: LogLevel,
        operation: string,
        message: string,
        metadata?: LogMetadata
    ): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            operation,
            message,
            metadata: this.sanitizeMetadata(metadata),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
        };

        // Development: Log to console for immediate feedback
        if (this.isDevelopment) {
            this.logToConsole(entry);
        }

        // Production: Send to backend only for WARN and ERROR
        if (this.isProduction && (level === LogLevel.WARN || level === LogLevel.ERROR)) {
            this.sendToBackend(entry);
        }

        // Development: Send all levels to backend if needed
        if (this.isDevelopment && level === LogLevel.ERROR) {
            this.sendToBackend(entry);
        }
    }

    /**
     * Sanitize metadata to prevent logging sensitive data
     */
    private sanitizeMetadata(metadata?: LogMetadata): LogMetadata | undefined {
        if (!metadata) return undefined;

        const sanitized = { ...metadata };
        const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];

        // Remove sensitive keys
        for (const key of sensitiveKeys) {
            if (key in sanitized) {
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Log to browser console (development only)
     */
    private logToConsole(entry: LogEntry): void {
        const { level, operation, message, metadata } = entry;
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${operation}]`;

        switch (level) {
            case LogLevel.DEBUG:
                // eslint-disable-next-line no-console
                console.debug(prefix, message, metadata || '');
                break;
            case LogLevel.INFO:
                // eslint-disable-next-line no-console
                console.info(prefix, message, metadata || '');
                break;
            case LogLevel.WARN:
                // eslint-disable-next-line no-console
                console.warn(prefix, message, metadata || '');
                break;
            case LogLevel.ERROR:
                // eslint-disable-next-line no-console
                console.error(prefix, message, metadata || '');
                break;
        }
    }

    /**
     * Send log entry to backend
     */
    private async sendToBackend(entry: LogEntry): Promise<void> {
        try {
            // Get auth token from localStorage
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            await fetch(this.backendEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(entry),
            });
        } catch (err) {
            // Fallback to console if backend logging fails
            // eslint-disable-next-line no-console
            console.error('[Logger] Failed to send log to backend:', err);
        }
    }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper function to log API errors consistently
 */
export function logApiError(
    operation: string,
    error: unknown,
    additionalMetadata?: LogMetadata
): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const metadata = {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        ...additionalMetadata,
    };

    logger.error(operation, 'API request failed', metadata);
}

/**
 * Helper function to wrap async operations with error logging
 */
export async function withErrorLogging<T>(
    operation: string,
    fn: () => Promise<T>,
    onError?: (error: unknown) => void
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        logApiError(operation, error);
        if (onError) {
            onError(error);
        }
        throw error;
    }
}

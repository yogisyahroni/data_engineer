export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    AUDIT = 'AUDIT'
}

export class ProductionLogger {
    /**
     * Standardized JSON logging for production monitoring (ELK/CloudWatch ready)
     */
    static log(level: LogLevel, message: string, meta: any = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta,
            env: process.env.NODE_ENV || 'development'
        };

        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(logEntry));
        } else {
            // Readable format for dev
            console.log(`[${level}] ${message}`, meta);
        }
    }

    static info(message: string, meta?: any) { this.log(LogLevel.INFO, message, meta); }
    static warn(message: string, meta?: any) { this.log(LogLevel.WARN, message, meta); }
    static error(message: string, meta?: any) { this.log(LogLevel.ERROR, message, meta); }
    static audit(message: string, meta?: any) { this.log(LogLevel.AUDIT, message, meta); }
}

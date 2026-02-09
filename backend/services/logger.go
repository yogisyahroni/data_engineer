package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"time"
)

// LogLevel represents the severity of a log entry
type LogLevel string

const (
	LogLevelDebug LogLevel = "DEBUG"
	LogLevelInfo  LogLevel = "INFO"
	LogLevelWarn  LogLevel = "WARN"
	LogLevelError LogLevel = "ERROR"
	LogLevelFatal LogLevel = "FATAL"
)

// LogEntry represents a single log entry
type LogEntry struct {
	Timestamp   string                 `json:"timestamp"`
	Level       LogLevel               `json:"level"`
	Service     string                 `json:"service"`
	Operation   string                 `json:"operation"`
	Message     string                 `json:"message"`
	UserID      string                 `json:"userID,omitempty"`
	RequestID   string                 `json:"requestID,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	SourceFile  string                 `json:"sourceFile,omitempty"`
	SourceLine  int                    `json:"sourceLine,omitempty"`
	Duration    int64                  `json:"duration,omitempty"`
	Environment string                 `json:"environment"`
}

// Logger provides structured JSON logging
type Logger struct {
	service     string
	environment string
	minLevel    LogLevel
}

// NewLogger creates a new structured logger
func NewLogger(service string) *Logger {
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = "development"
	}

	minLevel := LogLevelInfo
	if env == "development" {
		minLevel = LogLevelDebug
	}

	return &Logger{
		service:     service,
		environment: env,
		minLevel:    minLevel,
	}
}

// log writes a structured log entry
func (l *Logger) log(level LogLevel, operation, message string, metadata map[string]interface{}) {
	// Skip if below minimum level
	if !l.shouldLog(level) {
		return
	}

	// Capture source location
	_, file, line, _ := runtime.Caller(2)

	entry := LogEntry{
		Timestamp:   time.Now().UTC().Format(time.RFC3339Nano),
		Level:       level,
		Service:     l.service,
		Operation:   operation,
		Message:     message,
		Metadata:    metadata,
		SourceFile:  file,
		SourceLine:  line,
		Environment: l.environment,
	}

	// Extract common fields from metadata
	if metadata != nil {
		if userID, ok := metadata["user_id"].(string); ok {
			entry.UserID = userID
			delete(metadata, "user_id")
		}
		if requestID, ok := metadata["request_id"].(string); ok {
			entry.RequestID = requestID
			delete(metadata, "request_id")
		}
		if err, ok := metadata["error"].(error); ok {
			entry.Error = err.Error()
			delete(metadata, "error")
		}
		if errStr, ok := metadata["error"].(string); ok {
			entry.Error = errStr
			delete(metadata, "error")
		}
		if duration, ok := metadata["duration_ms"].(int64); ok {
			entry.Duration = duration
			delete(metadata, "duration_ms")
		}
	}

	// Marshal to JSON
	data, err := json.Marshal(entry)
	if err != nil {
		// Fallback to plain text if JSON marshaling fails
		fmt.Fprintf(os.Stderr, "[LOGGER ERROR] Failed to marshal log entry: %v\n", err)
		return
	}

	// Write to stdout (production systems redirect to log aggregator)
	fmt.Fprintln(os.Stdout, string(data))
}

// shouldLog determines if a log level should be written
func (l *Logger) shouldLog(level LogLevel) bool {
	levels := map[LogLevel]int{
		LogLevelDebug: 0,
		LogLevelInfo:  1,
		LogLevelWarn:  2,
		LogLevelError: 3,
		LogLevelFatal: 4,
	}
	return levels[level] >= levels[l.minLevel]
}

// Debug logs a debug-level message
func (l *Logger) Debug(operation, message string, metadata map[string]interface{}) {
	l.log(LogLevelDebug, operation, message, metadata)
}

// Info logs an info-level message
func (l *Logger) Info(operation, message string, metadata map[string]interface{}) {
	l.log(LogLevelInfo, operation, message, metadata)
}

// Warn logs a warning-level message
func (l *Logger) Warn(operation, message string, metadata map[string]interface{}) {
	l.log(LogLevelWarn, operation, message, metadata)
}

// Error logs an error-level message
func (l *Logger) Error(operation, message string, metadata map[string]interface{}) {
	l.log(LogLevelError, operation, message, metadata)
}

// Fatal logs a fatal-level message and exits the application
func (l *Logger) Fatal(operation, message string, metadata map[string]interface{}) {
	l.log(LogLevelFatal, operation, message, metadata)
	os.Exit(1)
}

// WithContext creates a logger with context values pre-populated
func (l *Logger) WithContext(ctx context.Context) *ContextLogger {
	return &ContextLogger{
		logger: l,
		ctx:    ctx,
	}
}

// ContextLogger wraps Logger with context awareness
type ContextLogger struct {
	logger *Logger
	ctx    context.Context
}

// extractMetadata extracts common metadata from context
func (cl *ContextLogger) extractMetadata(metadata map[string]interface{}) map[string]interface{} {
	if metadata == nil {
		metadata = make(map[string]interface{})
	}

	// Extract from context if available
	if userID, ok := cl.ctx.Value("userID").(string); ok && userID != "" {
		metadata["user_id"] = userID
	}
	if requestID, ok := cl.ctx.Value("requestID").(string); ok && requestID != "" {
		metadata["request_id"] = requestID
	}

	return metadata
}

// Debug logs with context
func (cl *ContextLogger) Debug(operation, message string, metadata map[string]interface{}) {
	cl.logger.Debug(operation, message, cl.extractMetadata(metadata))
}

// Info logs with context
func (cl *ContextLogger) Info(operation, message string, metadata map[string]interface{}) {
	cl.logger.Info(operation, message, cl.extractMetadata(metadata))
}

// Warn logs with context
func (cl *ContextLogger) Warn(operation, message string, metadata map[string]interface{}) {
	cl.logger.Warn(operation, message, cl.extractMetadata(metadata))
}

// Error logs with context
func (cl *ContextLogger) Error(operation, message string, metadata map[string]interface{}) {
	cl.logger.Error(operation, message, cl.extractMetadata(metadata))
}

// Fatal logs with context and exits
func (cl *ContextLogger) Fatal(operation, message string, metadata map[string]interface{}) {
	cl.logger.Fatal(operation, message, cl.extractMetadata(metadata))
}

// GlobalLogger is the application-wide logger instance
var GlobalLogger *Logger

// InitLogger initializes the global logger
func InitLogger(service string) {
	GlobalLogger = NewLogger(service)
	GlobalLogger.Info("logger_init", "Structured logger initialized", map[string]interface{}{
		"service": service,
	})
}

// Helper functions for global logger access
func LogDebug(operation, message string, metadata map[string]interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Debug(operation, message, metadata)
	}
}

func LogInfo(operation, message string, metadata map[string]interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Info(operation, message, metadata)
	}
}

func LogWarn(operation, message string, metadata map[string]interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Warn(operation, message, metadata)
	}
}

func LogError(operation, message string, metadata map[string]interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Error(operation, message, metadata)
	}
}

func LogFatal(operation, message string, metadata map[string]interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Fatal(operation, message, metadata)
	}
}

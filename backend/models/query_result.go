package models

import (
	"time"
)

// QueryResult represents the result of a query execution
type QueryResult struct {
	Columns       []string        `json:"columns"`
	Rows          [][]interface{} `json:"rows"`
	RowCount      int             `json:"rowCount"`
	ExecutionTime int64           `json:"executionTime"` // milliseconds
	Error         *string         `json:"error,omitempty"`
}

// QueryExecutionRequest represents a request to execute a query
type QueryExecutionRequest struct {
	SQL          string                 `json:"sql" validate:"required"`
	ConnectionID string                 `json:"connectionId" validate:"required"`
	Limit        *int                   `json:"limit"`
	Offset       *int                   `json:"offset"`
	Parameters   map[string]interface{} `json:"parameters"`
}

// QueryExecutionLog for audit trail
type QueryExecutionLog struct {
	ID            string    `gorm:"primaryKey;type:text" json:"id"`
	QueryID       *string   `gorm:"type:text" json:"queryId"`
	SQL           string    `gorm:"type:text;not null" json:"sql"`
	ConnectionID  string    `gorm:"type:text;not null" json:"connectionId"`
	UserID        string    `gorm:"type:text;not null" json:"userId"`
	Status        string    `gorm:"type:text;not null" json:"status"` // success, error, timeout
	RowCount      int       `gorm:"type:integer" json:"rowCount"`
	ExecutionTime int64     `gorm:"type:bigint" json:"executionTime"` // milliseconds
	ErrorMessage  *string   `gorm:"type:text" json:"errorMessage"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

// TableName overrides the table name
func (QueryExecutionLog) TableName() string {
	return "QueryExecutionLog"
}

package dtos

import "github.com/google/uuid"

// ExecuteQueryRequest represents a request to execute a database query
type ExecuteQueryRequest struct {
	ConnectionID uuid.UUID `json:"connectionId" validate:"required,uuid"`
	Query        string    `json:"query" validate:"required,min=1,max=10000"`
	Limit        *int      `json:"limit" validate:"omitempty,min=1,max=10000"`
}

// SemanticExplainRequest represents a request to explain data semantically
type SemanticExplainRequest struct {
	ConnectionID uuid.UUID              `json:"connectionId" validate:"required,uuid"`
	TableName    string                 `json:"tableName" validate:"required,min=1,max=255"`
	Columns      []string               `json:"columns" validate:"omitempty,dive,min=1,max=255"`
	SampleData   map[string]interface{} `json:"sampleData" validate:"omitempty"`
	RowLimit     *int                   `json:"rowLimit" validate:"omitempty,min=1,max=1000"`
}

// SemanticGenerateQueryRequest represents a request to generate SQL from natural language
type SemanticGenerateQueryRequest struct {
	ConnectionID  uuid.UUID `json:"connectionId" validate:"required,uuid"`
	NaturalQuery  string    `json:"naturalQuery" validate:"required,min=5,max=1000"`
	Context       *string   `json:"context" validate:"omitempty,max=2000"`
	IncludeTables []string  `json:"includeTables" validate:"omitempty,dive,min=1,max=255"`
}

// SemanticChatRequest represents a request for semantic chat/Q&A
type SemanticChatRequest struct {
	ConnectionID uuid.UUID              `json:"connectionId" validate:"required,uuid"`
	Message      string                 `json:"message" validate:"required,min=1,max=2000"`
	Context      []map[string]string    `json:"context" validate:"omitempty,dive"`
	Metadata     map[string]interface{} `json:"metadata" validate:"omitempty"`
}

// CreateProjectRequest represents a request to create a new project
type CreateProjectRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
}

// UpdateProjectRequest represents a request to update a project
type UpdateProjectRequest struct {
	Name        *string `json:"name" validate:"omitempty,min=2,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
}

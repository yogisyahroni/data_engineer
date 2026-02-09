package dtos

// CreateConnectionRequest represents a request to create a database connection
type CreateConnectionRequest struct {
	Name     string                 `json:"name" validate:"required,min=2,max=100"`
	Type     string                 `json:"type" validate:"required,oneof=postgresql mysql sqlserver oracle mongodb snowflake bigquery"`
	Host     string                 `json:"host" validate:"required_if=Type postgresql,required_if=Type mysql,required_if=Type sqlserver,required_if=Type oracle,min=1,max=255"`
	Port     int                    `json:"port" validate:"required_if=Type postgresql,required_if=Type mysql,required_if=Type sqlserver,required_if=Type oracle,min=1,max=65535"`
	Database string                 `json:"database" validate:"required,min=1,max=255"`
	Username string                 `json:"username" validate:"required_if=Type postgresql,required_if=Type mysql,required_if=Type sqlserver,required_if=Type oracle,max=255"`
	Password string                 `json:"password" validate:"max=255"`
	SSL      bool                   `json:"ssl"`
	Options  map[string]interface{} `json:"options"`
}

// UpdateConnectionRequest represents a request to update a database connection
type UpdateConnectionRequest struct {
	Name     *string                `json:"name" validate:"omitempty,min=2,max=100"`
	Host     *string                `json:"host" validate:"omitempty,min=1,max=255"`
	Port     *int                   `json:"port" validate:"omitempty,min=1,max=65535"`
	Database *string                `json:"database" validate:"omitempty,min=1,max=255"`
	Username *string                `json:"username" validate:"omitempty,max=255"`
	Password *string                `json:"password" validate:"omitempty,max=255"`
	SSL      *bool                  `json:"ssl"`
	Options  map[string]interface{} `json:"options"`
}

// TestConnectionRequest represents a request to test a database connection
type TestConnectionRequest struct {
	Type     string                 `json:"type" validate:"required,oneof=postgresql mysql sqlserver oracle mongodb snowflake bigquery"`
	Host     string                 `json:"host" validate:"required,min=1,max=255"`
	Port     int                    `json:"port" validate:"required,min=1,max=65535"`
	Database string                 `json:"database" validate:"required,min=1,max=255"`
	Username string                 `json:"username" validate:"required,max=255"`
	Password string                 `json:"password" validate:"max=255"`
	SSL      bool                   `json:"ssl"`
	Options  map[string]interface{} `json:"options"`
}

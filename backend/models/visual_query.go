package models

import (
	"time"
)

// VisualQuery represents a visual query builder configuration
type VisualQuery struct {
	ID           string    `gorm:"primaryKey;type:text" json:"id"`
	Name         string    `gorm:"type:text;not null" json:"name"`
	Description  *string   `gorm:"type:text" json:"description"`
	ConnectionID string    `gorm:"type:text;not null" json:"connectionId"`
	CollectionID string    `gorm:"type:text;not null" json:"collectionId"`
	UserID       string    `gorm:"type:text;not null" json:"userId"`
	Config       []byte    `gorm:"type:jsonb;not null" json:"config"`
	GeneratedSQL *string   `gorm:"type:text" json:"generatedSql"`
	Tags         []string  `gorm:"type:text[]" json:"tags"`
	Pinned       bool      `gorm:"default:false" json:"pinned"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relationships
	Connection *Connection `gorm:"foreignKey:ConnectionID" json:"connection,omitempty"`
}

// TableName overrides the table name
func (VisualQuery) TableName() string {
	return "visual_queries"
}

// VisualQueryConfig represents the visual query configuration structure
type VisualQueryConfig struct {
	Tables       []TableSelection  `json:"tables"`
	Joins        []JoinConfig      `json:"joins"`
	Columns      []ColumnSelection `json:"columns"`
	Filters      []FilterCondition `json:"filters"`
	Aggregations []Aggregation     `json:"aggregations"`
	GroupBy      []string          `json:"groupBy"`
	OrderBy      []OrderByClause   `json:"orderBy"`
	Limit        *int              `json:"limit"`
}

// TableSelection represents a selected table in the query
type TableSelection struct {
	Name  string `json:"name"`
	Alias string `json:"alias"`
}

// JoinConfig represents a join configuration
type JoinConfig struct {
	Type        string `json:"type"` // INNER, LEFT, RIGHT, FULL
	LeftTable   string `json:"leftTable"`
	RightTable  string `json:"rightTable"`
	LeftColumn  string `json:"leftColumn"`
	RightColumn string `json:"rightColumn"`
}

// ColumnSelection represents a selected column
type ColumnSelection struct {
	Table       string  `json:"table"`
	Column      string  `json:"column"`
	Alias       *string `json:"alias"`
	Aggregation *string `json:"aggregation"` // SUM, AVG, COUNT, MIN, MAX
}

// FilterCondition represents a filter condition
type FilterCondition struct {
	Column   string      `json:"column"`
	Operator string      `json:"operator"` // =, !=, >, <, >=, <=, LIKE, IN, BETWEEN
	Value    interface{} `json:"value"`
	Logic    string      `json:"logic"` // AND, OR
}

// Aggregation represents an aggregation function
type Aggregation struct {
	Function string `json:"function"` // SUM, AVG, COUNT, MIN, MAX
	Column   string `json:"column"`
	Alias    string `json:"alias"`
}

// OrderByClause represents an ORDER BY clause
type OrderByClause struct {
	Column    string `json:"column"`
	Direction string `json:"direction"` // ASC, DESC
}

// VisualQueryDTO for API responses
type VisualQueryDTO struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  *string   `json:"description"`
	ConnectionID string    `json:"connectionId"`
	CollectionID string    `json:"collectionId"`
	UserID       string    `json:"userId"`
	Config       []byte    `json:"config"`
	GeneratedSQL *string   `json:"generatedSql"`
	Tags         []string  `json:"tags"`
	Pinned       bool      `json:"pinned"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// ToDTO converts VisualQuery to DTO
func (vq *VisualQuery) ToDTO() VisualQueryDTO {
	return VisualQueryDTO{
		ID:           vq.ID,
		Name:         vq.Name,
		Description:  vq.Description,
		ConnectionID: vq.ConnectionID,
		CollectionID: vq.CollectionID,
		UserID:       vq.UserID,
		Config:       vq.Config,
		GeneratedSQL: vq.GeneratedSQL,
		Tags:         vq.Tags,
		Pinned:       vq.Pinned,
		CreatedAt:    vq.CreatedAt,
		UpdatedAt:    vq.UpdatedAt,
	}
}

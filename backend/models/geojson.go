package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// GeoJSONFile represents an uploaded GeoJSON file for map visualizations
type GeoJSONFile struct {
	ID           uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID       `json:"user_id" gorm:"type:uuid;not null;index"`
	Name         string          `json:"name" gorm:"type:varchar(255);not null"`
	Description  string          `json:"description" gorm:"type:text"`
	Filename     string          `json:"filename" gorm:"type:varchar(255);not null"`
	FileSize     int             `json:"file_size" gorm:"not null"` // in bytes
	FeatureCount int             `json:"feature_count" gorm:"default:0"`
	BBox         json.RawMessage `json:"bbox" gorm:"type:jsonb"` // [[minLng, minLat], [maxLng, maxLat]]
	GeoJSONData  json.RawMessage `json:"geojson_data" gorm:"type:jsonb;not null"`
	CreatedAt    time.Time       `json:"created_at" gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time       `json:"updated_at" gorm:"not null;default:CURRENT_TIMESTAMP"`
}

// TableName specifies the table name for GORM
func (GeoJSONFile) TableName() string {
	return "geojson_files"
}

// GeoJSONFeature represents a single feature in a GeoJSON FeatureCollection
type GeoJSONFeature struct {
	Type       string                 `json:"type"`
	Geometry   GeoJSONGeometry        `json:"geometry"`
	Properties map[string]interface{} `json:"properties"`
	ID         interface{}            `json:"id,omitempty"`
}

// GeoJSONGeometry represents the geometry object
type GeoJSONGeometry struct {
	Type        string          `json:"type"`
	Coordinates json.RawMessage `json:"coordinates"`
}

// GeoJSONFeatureCollection represents the full GeoJSON structure
type GeoJSONFeatureCollection struct {
	Type     string           `json:"type"`
	Features []GeoJSONFeature `json:"features"`
	BBox     []float64        `json:"bbox,omitempty"`
}

// ValidateGeoJSON validates the structure of a GeoJSON FeatureCollection
func ValidateGeoJSON(data json.RawMessage) (*GeoJSONFeatureCollection, error) {
	var fc GeoJSONFeatureCollection
	if err := json.Unmarshal(data, &fc); err != nil {
		return nil, err
	}

	// Validate type
	if fc.Type != "FeatureCollection" {
		return nil, &ValidationError{
			Field:   "type",
			Message: "GeoJSON must be a FeatureCollection",
		}
	}

	// Validate features exist
	if len(fc.Features) == 0 {
		return nil, &ValidationError{
			Field:   "features",
			Message: "GeoJSON must contain at least one feature",
		}
	}

	return &fc, nil
}

// CalculateBBox calculates the bounding box from GeoJSON features
func (fc *GeoJSONFeatureCollection) CalculateBBox() []float64 {
	if len(fc.Features) == 0 {
		return nil
	}

	var minLng, minLat, maxLng, maxLat float64
	initialized := false

	for _, feature := range fc.Features {
		coords := extractCoordinates(feature.Geometry)
		for _, coord := range coords {
			if len(coord) < 2 {
				continue
			}
			lng, lat := coord[0], coord[1]

			if !initialized {
				minLng, maxLng = lng, lng
				minLat, maxLat = lat, lat
				initialized = true
			} else {
				if lng < minLng {
					minLng = lng
				}
				if lng > maxLng {
					maxLng = lng
				}
				if lat < minLat {
					minLat = lat
				}
				if lat > maxLat {
					maxLat = lat
				}
			}
		}
	}

	if !initialized {
		return nil
	}

	return []float64{minLng, minLat, maxLng, maxLat}
}

// extractCoordinates recursively extracts all coordinates from geometry
func extractCoordinates(geom GeoJSONGeometry) [][]float64 {
	var coords [][]float64

	switch geom.Type {
	case "Point":
		var point []float64
		if err := json.Unmarshal(geom.Coordinates, &point); err == nil {
			coords = append(coords, point)
		}
	case "MultiPoint", "LineString":
		var lineString [][]float64
		if err := json.Unmarshal(geom.Coordinates, &lineString); err == nil {
			coords = append(coords, lineString...)
		}
	case "MultiLineString", "Polygon":
		var polygon [][][]float64
		if err := json.Unmarshal(geom.Coordinates, &polygon); err == nil {
			for _, ring := range polygon {
				coords = append(coords, ring...)
			}
		}
	case "MultiPolygon":
		var multiPolygon [][][][]float64
		if err := json.Unmarshal(geom.Coordinates, &multiPolygon); err == nil {
			for _, polygon := range multiPolygon {
				for _, ring := range polygon {
					coords = append(coords, ring...)
				}
			}
		}
	}

	return coords
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}

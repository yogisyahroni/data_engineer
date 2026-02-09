// Shared TypeScript types untuk map visualizations
// TASK-036 to TASK-039

import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'

/**
 * Map visualization configuration
 */
export interface MapConfig {
    center?: LatLngExpression
    zoom?: number
    minZoom?: number
    maxZoom?: number
    bounds?: LatLngBoundsExpression
    scrollWheelZoom?: boolean
    dragging?: boolean
    zoomControl?: boolean
    attributionControl?: boolean
}

/**
 * Map data point (for point maps - TASK-038)
 */
export interface MapDataPoint {
    id: string | number
    lat: number
    lng: number
    value?: number
    label?: string
    properties?: Record<string, any>
}

/**
 * GeoJSON Feature (for choropleth maps - TASK-037)
 */
export interface GeoJSONFeature {
    type: 'Feature'
    geometry: {
        type: string
        coordinates: any
    }
    properties: Record<string, any>
    id?: string | number
}

/**
 * GeoJSON FeatureCollection
 */
export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection'
    features: GeoJSONFeature[]
    bbox?: number[]
}

/**
 * Uploaded GeoJSON file metadata
 */
export interface GeoJSONFile {
    id: string
    user_id: string
    name: string
    description?: string
    filename: string
    file_size: number
    feature_count: number
    bbox?: number[][] // [[minLng, minLat], [maxLng, maxLat]]
    created_at: string
    updated_at: string
}

/**
 * Color scale configuration (for choropleth)
 */
export interface ColorScale {
    type: 'sequential' | 'diverging' | 'categorical'
    colors: string[]
    domain?: [number, number]
    steps?: number
}

/**
 * Choropleth map configuration (TASK-037)
 */
export interface ChoroplethConfig extends MapConfig {
    geojsonFileId?: string
    dataColumn: string // column name dari query results
    joinProperty: string // property name di GeoJSON untuk join
    colorScale: ColorScale
    showLegend?: boolean
    tooltipTemplate?: string
}

/**
 * Point map configuration (TASK-038)
 */
export interface PointMapConfig extends MapConfig {
    latColumn: string
    lngColumn: string
    valueColumn?: string
    labelColumn?: string
    clustering?: boolean
    clusterRadius?: number
    heatmap?: boolean
    heatmapRadius?: number
    heatmapBlur?: number
    markerColor?: string
    showPopup?: boolean
}

/**
 * Map layer types
 */
export type MapLayerType = 'base' | 'choropleth' | 'points' | 'heatmap' | 'cluster'

/**
 * Map layer configuration
 */
export interface MapLayer {
    id: string
    type: MapLayerType
    name: string
    visible: boolean
    opacity?: number
    config: ChoroplethConfig | PointMapConfig | MapConfig
}

/**
 * Tile provider configuration
 */
export interface TileProvider {
    id: string
    name: string
    url: string
    attribution: string
    maxZoom: number
    minZoom?: number
}

/**
 * Map visualization props (base component - TASK-036)
 */
export interface MapChartProps {
    data: MapDataPoint[]
    config: MapConfig
    height?: string | number
    width?: string | number
    className?: string
    onMarkerClick?: (point: MapDataPoint) => void
}

/**
 * Choropleth map props (TASK-037)
 */
export interface ChoroplethMapProps {
    data: Record<string, number> // key = joinProperty value, value = metric
    geojsonData: GeoJSONFeatureCollection
    config: ChoroplethConfig
    height?: string | number
    width?: string | number
    className?: string
    onFeatureClick?: (feature: GeoJSONFeature, value?: number) => void
}

/**
 * Point map props (TASK-038)
 */
export interface PointMapProps extends MapChartProps {
    config: PointMapConfig
}

/**
 * Map config sidebar props (TASK-039)
 */
export interface MapConfigProps {
    mapType: 'base' | 'choropleth' | 'points'
    config: MapConfig | ChoroplethConfig | PointMapConfig
    onChange: (config: MapConfig | ChoroplethConfig | PointMapConfig) => void
    availableColumns: string[]
    geojsonFiles: GeoJSONFile[]
    onUploadGeoJSON?: (file: File) => Promise<GeoJSONFile>
}

/**
 * Bounding box type
 */
export type BBox = [number, number, number, number] // [minLng, minLat, maxLng, maxLat]

/**
 * Coordinate validation result
 */
export interface CoordinateValidation {
    isValid: boolean
    error?: string
    lat?: number
    lng?: number
}

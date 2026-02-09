// Map utilities untuk validation, conversion, dan helper functions
// TASK-036 to TASK-039

import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet'
import type {
    MapDataPoint,
    GeoJSONFeatureCollection,
    CoordinateValidation,
    BBox,
    ColorScale
} from './map-types'

/**
 * Validate latitude value
 */
export function isValidLatitude(lat: number): boolean {
    return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * Validate longitude value
 */
export function isValidLongitude(lng: number): boolean {
    return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
}

/**
 * Validate coordinate pair
 */
export function validateCoordinates(lat: unknown, lng: unknown): CoordinateValidation {
    const latNum = typeof lat === 'string' ? parseFloat(lat) : lat as number
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng as number

    if (!isValidLatitude(latNum)) {
        return {
            isValid: false,
            error: `Invalid latitude: ${lat}. Must be between -90 and 90.`
        }
    }

    if (!isValidLongitude(lngNum)) {
        return {
            isValid: false,
            error: `Invalid longitude: ${lng}. Must be between -180 and 180.`
        }
    }

    return {
        isValid: true,
        lat: latNum,
        lng: lngNum
    }
}

/**
 * Calculate center point from array of coordinates
 */
export function calculateCenter(points: MapDataPoint[]): LatLngExpression | null {
    if (points.length === 0) return null

    let sumLat = 0
    let sumLng = 0
    let validCount = 0

    for (const point of points) {
        const validation = validateCoordinates(point.lat, point.lng)
        if (validation.isValid && validation.lat && validation.lng) {
            sumLat += validation.lat
            sumLng += validation.lng
            validCount++
        }
    }

    if (validCount === 0) return null

    return [sumLat / validCount, sumLng / validCount]
}

/**
 * Calculate bounding box from points
 */
export function calculateBounds(points: MapDataPoint[]): LatLngBoundsExpression | null {
    if (points.length === 0) return null

    let minLat = Infinity
    let maxLat = -Infinity
    let minLng = Infinity
    let maxLng = -Infinity

    for (const point of points) {
        const validation = validateCoordinates(point.lat, point.lng)
        if (validation.isValid && validation.lat && validation.lng) {
            minLat = Math.min(minLat, validation.lat)
            maxLat = Math.max(maxLat, validation.lat)
            minLng = Math.min(minLng, validation.lng)
            maxLng = Math.max(maxLng, validation.lng)
        }
    }

    if (minLat === Infinity) return null

    return [
        [minLat, minLng],
        [maxLat, maxLng]
    ]
}

/**
 * Convert BBox to LatLngBoundsExpression
 */
export function bboxToBounds(bbox: BBox): LatLngBoundsExpression {
    const [minLng, minLat, maxLng, maxLat] = bbox
    return [
        [minLat, minLng],
        [maxLat, maxLng]
    ]
}

/**
 * Generate color from value using color scale
 */
export function getColorForValue(
    value: number,
    colorScale: ColorScale
): string {
    const { type, colors, domain, steps } = colorScale

    if (type === 'categorical') {
        // Simple categorical mapping
        const index = Math.floor(value) % colors.length
        return colors[index]
    }

    if (!domain || domain.length !== 2) {
        return colors[0]
    }

    const [min, max] = domain
    const normalizedValue = (value - min) / (max - min)
    const clampedValue = Math.max(0, Math.min(1, normalizedValue))

    if (type === 'sequential') {
        // Linear interpolation through colors
        const colorIndex = clampedValue * (colors.length - 1)
        const lowerIndex = Math.floor(colorIndex)
        const upperIndex = Math.ceil(colorIndex)

        if (lowerIndex === upperIndex) {
            return colors[lowerIndex]
        }

        // Simple interpolation (could be improved with color space interpolation)
        return colors[lowerIndex]
    }

    if (type === 'diverging') {
        // Diverging scale (e.g., red-white-blue)
        const middleIndex = Math.floor(colors.length / 2)

        if (clampedValue < 0.5) {
            // Lower half
            const lowerColorIndex = clampedValue * 2 * middleIndex
            return colors[Math.floor(lowerColorIndex)]
        } else {
            // Upper half
            const upperColorIndex = (clampedValue - 0.5) * 2 * (colors.length - middleIndex - 1) + middleIndex
            return colors[Math.floor(upperColorIndex)]
        }
    }

    return colors[0]
}

/**
 * Generate stepped color scale (for legends)
 */
export function generateColorSteps(
    colorScale: ColorScale,
    stepCount: number = 5
): Array<{ value: number; color: string }> {
    const { domain } = colorScale

    if (!domain || domain.length !== 2) {
        return []
    }

    const [min, max] = domain
    const step = (max - min) / (stepCount - 1)

    return Array.from({ length: stepCount }, (_, i) => {
        const value = min + step * i
        return {
            value,
            color: getColorForValue(value, colorScale)
        }
    })
}

/**
 * Validate GeoJSON structure
 */
export function validateGeoJSON(data: any): data is GeoJSONFeatureCollection {
    if (!data || typeof data !== 'object') {
        return false
    }

    if (data.type !== 'FeatureCollection') {
        return false
    }

    if (!Array.isArray(data.features) || data.features.length === 0) {
        return false
    }

    // Validate at least one feature
    const firstFeature = data.features[0]
    if (!firstFeature || firstFeature.type !== 'Feature' || !firstFeature.geometry) {
        return false
    }

    return true
}

/**
 * Format number for map labels/tooltips
 */
export function formatMapNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return 'N/A'
    }

    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
    }

    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
    }

    return value.toFixed(0)
}

/**
 * Default tile providers
 */
export const DEFAULT_TILE_PROVIDERS = {
    osm: {
        id: 'osm',
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    },
    cartodb: {
        id: 'cartodb',
        name: 'CartoDB Positron',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    },
    dark: {
        id: 'dark',
        name: 'CartoDB Dark Matter',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    }
} as const

/**
 * Default map configuration
 */
export const DEFAULT_MAP_CONFIG = {
    center: [0, 0] as LatLngExpression,
    zoom: 2,
    minZoom: 1,
    maxZoom: 18,
    scrollWheelZoom: true,
    dragging: true,
    zoomControl: true,
    attributionControl: true
}

/**
 * Default color scales
 */
export const DEFAULT_COLOR_SCALES: Record<string, ColorScale> = {
    sequential_blue: {
        type: 'sequential',
        colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
        steps: 9
    },
    sequential_green: {
        type: 'sequential',
        colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
        steps: 9
    },
    diverging_red_blue: {
        type: 'diverging',
        colors: ['#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac'],
        steps: 9
    },
    viridis: {
        type: 'sequential',
        colors: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde724'],
        steps: 10
    }
}

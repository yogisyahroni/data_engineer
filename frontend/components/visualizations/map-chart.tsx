'use client'

// Base Map Chart Component - TASK-036
// Leaflet-based interactive map with coordinate display, zoom/pan controls

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useMap } from 'react-leaflet' // Hook must be imported directly
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { MapChartProps, MapDataPoint } from './map-types'
import {
    validateCoordinates,
    calculateCenter,
    calculateBounds,
    DEFAULT_MAP_CONFIG,
    DEFAULT_TILE_PROVIDERS,
    formatMapNumber
} from './map-utils'

// Dynamic import untuk Leaflet components (prevent SSR issues)
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false, loading: () => <MapLoadingState /> }
)

const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
)

const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
)

const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
)

/**
 * Loading state component
 */
function MapLoadingState() {
    return (
        <div className="flex items-center justify-center h-full w-full bg-muted/30 rounded-lg">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
        </div>
    )
}

/**
 * Map bounds updater component (handles dynamic bounds when data changes)
 */
function MapBoundsUpdater({ points }: { points: MapDataPoint[] }) {
    const map = useMap()

    useEffect(() => {
        if (points.length === 0) return

        const bounds = calculateBounds(points)
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [points, map])

    return null
}

/**
 * Base Map Chart Component
 * 
 * Features:
 * - Leaflet map integration
 * - Coordinate validation
 * - Zoom/pan controls
 * - Marker rendering
 * - Popup tooltips
 * - Auto-fit bounds
 * - Responsive sizing
 * 
 * @param props - MapChartProps
 */
export function MapChart({
    data,
    config,
    height = '500px',
    width = '100%',
    className = '',
    onMarkerClick
}: MapChartProps) {
    const [validPoints, setValidPoints] = useState<MapDataPoint[]>([])
    const [invalidPoints, setInvalidPoints] = useState<number>(0)
    const [isClient, setIsClient] = useState(false)

    // Client-side rendering check
    useEffect(() => {
        setIsClient(true)
    }, [])

    // Validate and filter points
    useEffect(() => {
        const valid: MapDataPoint[] = []
        let invalid = 0

        data.forEach((point) => {
            const validation = validateCoordinates(point.lat, point.lng)
            if (validation.isValid && validation.lat !== undefined && validation.lng !== undefined) {
                valid.push({
                    ...point,
                    lat: validation.lat,
                    lng: validation.lng
                })
            } else {
                invalid++
            }
        })

        setValidPoints(valid)
        setInvalidPoints(invalid)
    }, [data])

    // Merge config with defaults
    const mapConfig = useMemo(() => ({
        ...DEFAULT_MAP_CONFIG,
        ...config
    }), [config])

    // Calculate center from data or use config center
    const mapCenter = useMemo(() => {
        if (config.center) {
            return config.center
        }
        return calculateCenter(validPoints) || DEFAULT_MAP_CONFIG.center
    }, [config.center, validPoints])

    // SSR protection - only render on client
    if (!isClient) {
        return <MapLoadingState />
    }

    // No valid points
    if (validPoints.length === 0 && data.length > 0) {
        return (
            <div className={`relative ${className}`} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        No valid coordinates found. Ensure data contains valid latitude (-90 to 90) and longitude (-180 to 180) values.
                        {invalidPoints > 0 && ` (${invalidPoints} invalid points)`}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Empty data
    if (data.length === 0) {
        return (
            <div className={`relative ${className}`} style={{ height, width }}>
                <div className="flex items-center justify-center h-full w-full bg-muted/30 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">No data to display on map</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`} style={{ height, width }}>
            {/* Invalid points warning */}
            {invalidPoints > 0 && (
                <div className="absolute top-2 right-2 z-[1000] bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded px-3 py-1 text-xs">
                    ⚠️ {invalidPoints} invalid coordinate{invalidPoints > 1 ? 's' : ''} filtered
                </div>
            )}

            {/* Map container */}
            <MapContainer
                center={mapCenter}
                zoom={mapConfig.zoom}
                scrollWheelZoom={mapConfig.scrollWheelZoom}
                dragging={mapConfig.dragging}
                zoomControl={mapConfig.zoomControl}
                attributionControl={mapConfig.attributionControl}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                className="leaflet-container"
            >
                {/* Tile layer (base map) */}
                <TileLayer
                    url={DEFAULT_TILE_PROVIDERS.osm.url}
                    attribution={DEFAULT_TILE_PROVIDERS.osm.attribution}
                    maxZoom={DEFAULT_TILE_PROVIDERS.osm.maxZoom}
                />

                {/* Auto-fit bounds when points change */}
                <MapBoundsUpdater points={validPoints} />

                {/* Markers */}
                {validPoints.map((point) => (
                    <Marker
                        key={point.id}
                        position={[point.lat, point.lng]}
                        eventHandlers={{
                            click: () => {
                                if (onMarkerClick) {
                                    onMarkerClick(point)
                                }
                            }
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                {point.label && (
                                    <div className="font-semibold mb-1">{point.label}</div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                    <div>Lat: {point.lat.toFixed(6)}</div>
                                    <div>Lng: {point.lng.toFixed(6)}</div>
                                </div>
                                {point.value !== undefined && (
                                    <div className="mt-1 pt-1 border-t">
                                        <span className="font-medium">Value: </span>
                                        <span>{formatMapNumber(point.value)}</span>
                                    </div>
                                )}
                                {point.properties && Object.keys(point.properties).length > 0 && (
                                    <div className="mt-1 pt-1 border-t text-xs">
                                        {Object.entries(point.properties).map(([key, value]) => (
                                            <div key={key}>
                                                <span className="font-medium">{key}: </span>
                                                <span>{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Map stats overlay */}
            <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border rounded px-3 py-1.5 text-xs shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Points:</span>
                    <span className="font-medium">{validPoints.length}</span>
                </div>
            </div>
        </div>
    )
}

/**
 * Map Chart with error boundary
 */
export default function MapChartWithErrorBoundary(props: MapChartProps) {
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        // Reset error state when props change
        setHasError(false)
    }, [props])

    if (hasError) {
        return (
            <div className="relative" style={{ height: props.height || '500px', width: props.width || '100%' }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        Failed to render map. Please check your data and try again.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    try {
        return <MapChart {...props} />
    } catch (error) {
        console.error('Map rendering error:', error)
        setHasError(true)
        return null
    }
}

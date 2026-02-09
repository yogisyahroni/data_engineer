'use client'

// Point Map Component - TASK-038
// Point/bubble map with marker clustering and heatmap overlay

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useMap } from 'react-leaflet' // Hook must be imported directly
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PointMapProps, MapDataPoint } from './map-types'
import {
    validateCoordinates,
    calculateCenter,
    calculateBounds,
    DEFAULT_MAP_CONFIG,
    DEFAULT_TILE_PROVIDERS,
    formatMapNumber
} from './map-utils'

// Dynamic imports for SSR safety (components only, not hooks!)
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div> }
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

const CircleMarker = dynamic(
    () => import('react-leaflet').then((mod) => mod.CircleMarker),
    { ssr: false }
)

/**
 * Map bounds updater
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
 * Marker Cluster Layer (client-side only)
 */
function MarkerClusterLayer({
    points,
    onMarkerClick,
    markerColor = '#3b82f6',
    showPopup = true
}: {
    points: MapDataPoint[]
    onMarkerClick?: (point: MapDataPoint) => void
    markerColor?: string
    showPopup?: boolean
}) {
    const [MarkerClusterGroup, setMarkerClusterGroup] = useState<any>(null)
    const [L, setL] = useState<any>(null)

    useEffect(() => {
        // Load Leaflet and MarkerClusterGroup dynamically
        Promise.all([
            import('leaflet'),
            import('leaflet.markercluster')
        ]).then(([leaflet]) => {
            setL(leaflet.default)
            // MarkerClusterGroup is attached to L after import
            setMarkerClusterGroup(() => (leaflet.default as any).MarkerClusterGroup)
        })
    }, [])

    const map = useMap()

    useEffect(() => {
        if (!MarkerClusterGroup || !L || !map) return

        // Create marker cluster group
        const clusterGroup = new MarkerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 50
        })

        // Add markers to cluster
        points.forEach((point) => {
            const marker = L.marker([point.lat, point.lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            })

            if (showPopup) {
                const popupContent = `
          <div style="padding: 4px;">
            ${point.label ? `<div style="font-weight: 600; margin-bottom: 4px;">${point.label}</div>` : ''}
            <div style="font-size: 11px; color: #6b7280;">
              <div>Lat: ${point.lat.toFixed(6)}</div>
              <div>Lng: ${point.lng.toFixed(6)}</div>
            </div>
            ${point.value !== undefined ? `
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                <span style="font-weight: 500;">Value: </span>
                <span>${formatMapNumber(point.value)}</span>
              </div>
            ` : ''}
          </div>
        `
                marker.bindPopup(popupContent)
            }

            marker.on('click', () => {
                if (onMarkerClick) {
                    onMarkerClick(point)
                }
            })

            clusterGroup.addLayer(marker)
        })

        map.addLayer(clusterGroup)

        return () => {
            map.removeLayer(clusterGroup)
        }
    }, [MarkerClusterGroup, L, map, points, onMarkerClick, markerColor, showPopup])

    return null
}

/**
 * Heatmap Layer (client-side only)
 */
function HeatmapLayer({
    points,
    radius = 25,
    blur = 15
}: {
    points: MapDataPoint[]
    radius?: number
    blur?: number
}) {
    const [HeatLayer, setHeatLayer] = useState<any>(null)
    const [L, setL] = useState<any>(null)

    useEffect(() => {
        // Load Leaflet and Heatmap plugin dynamically
        Promise.all([
            import('leaflet'),
            import('leaflet.heat')
        ]).then(([leaflet]) => {
            setL(leaflet.default)
            setHeatLayer(() => (leaflet.default as any).heatLayer)
        })
    }, [])

    const map = useMap()

    useEffect(() => {
        if (!HeatLayer || !L || !map || points.length === 0) return

        // Prepare heatmap data: [[lat, lng, intensity], ...]
        const heatData = points.map((point) => [
            point.lat,
            point.lng,
            point.value || 1 // Use value as intensity, default to 1
        ])

        const heatmapLayer = HeatLayer(heatData, {
            radius: radius,
            blur: blur,
            maxZoom: 17,
            gradient: {
                0.0: 'blue',
                0.5: 'lime',
                0.7: 'yellow',
                1.0: 'red'
            }
        })

        map.addLayer(heatmapLayer)

        return () => {
            map.removeLayer(heatmapLayer)
        }
    }, [HeatLayer, L, map, points, radius, blur])

    return null
}

/**
 * Point Map Component
 * 
 * Features:
 * - lat/lng point plotting
 * - Marker clustering
 * - Heatmap overlay
 * - Bubble sizing by value
 * - Custom marker colors
 * - Interactive popups
 * 
 * @param props - PointMapProps
 */
export function PointMap({
    data,
    config,
    height = '500px',
    width = '100%',
    className = '',
    onMarkerClick
}: PointMapProps) {
    const [validPoints, setValidPoints] = useState<MapDataPoint[]>([])
    const [invalidPoints, setInvalidPoints] = useState<number>(0)
    const [isClient, setIsClient] = useState(false)

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

    // Calculate center
    const mapCenter = useMemo(() => {
        if (config.center) {
            return config.center
        }
        return calculateCenter(validPoints) || DEFAULT_MAP_CONFIG.center
    }, [config.center, validPoints])

    // SSR protection
    if (!isClient) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ height, width }}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // No valid points
    if (validPoints.length === 0 && data.length > 0) {
        return (
            <div className={`relative ${className}`} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        No valid coordinates found. Check latitude (-90 to 90) and longitude (-180 to 180) values.
                        {invalidPoints > 0 && ` (${invalidPoints} invalid points)`}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Empty state
    if (data.length === 0) {
        return (
            <div className={`relative ${className}`} style={{ height, width }}>
                <div className="flex items-center justify-center h-full w-full bg-muted/30 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">No points to display</p>
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

            {/* Mode indicator */}
            <div className="absolute top-2 left-2 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border rounded px-3 py-1.5 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium">
                        {config.heatmap ? 'Heatmap' : config.clustering ? 'Clustering' : 'Standard'}
                    </span>
                </div>
            </div>

            <MapContainer
                center={mapCenter}
                zoom={mapConfig.zoom}
                scrollWheelZoom={mapConfig.scrollWheelZoom}
                dragging={mapConfig.dragging}
                zoomControl={mapConfig.zoomControl}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
            >
                <TileLayer
                    url={DEFAULT_TILE_PROVIDERS.osm.url}
                    attribution={DEFAULT_TILE_PROVIDERS.osm.attribution}
                    maxZoom={DEFAULT_TILE_PROVIDERS.osm.maxZoom}
                />

                <MapBoundsUpdater points={validPoints} />

                {/* Render mode: Heatmap, Clustering, or Standard */}
                {config.heatmap ? (
                    <HeatmapLayer
                        points={validPoints}
                        radius={config.heatmapRadius}
                        blur={config.heatmapBlur}
                    />
                ) : config.clustering ? (
                    <MarkerClusterLayer
                        points={validPoints}
                        onMarkerClick={onMarkerClick}
                        markerColor={config.markerColor}
                        showPopup={config.showPopup}
                    />
                ) : (
                    // Standard markers
                    validPoints.map((point) => (
                        <CircleMarker
                            key={point.id}
                            center={[point.lat, point.lng]}
                            radius={point.value ? Math.sqrt(point.value) * 2 : 6}
                            fillColor={config.markerColor || '#3b82f6'}
                            fillOpacity={0.7}
                            color="#ffffff"
                            weight={2}
                            eventHandlers={{
                                click: () => {
                                    if (onMarkerClick) {
                                        onMarkerClick(point)
                                    }
                                }
                            }}
                        >
                            {config.showPopup !== false && (
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
                                    </div>
                                </Popup>
                            )}
                        </CircleMarker>
                    ))
                )}
            </MapContainer>

            {/* Stats overlay */}
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
 * Point Map with Error Boundary
 */
export default function PointMapWithErrorBoundary(props: PointMapProps) {
    const [hasError, setHasError] = useState(false)

    if (hasError) {
        return (
            <div className="relative" style={{ height: props.height || '500px', width: props.width || '100%' }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        Failed to render point map. Please verify your coordinate data.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    try {
        return <PointMap {...props} />
    } catch (error) {
        console.error('Point map error:', error)
        setHasError(true)
        return null
    }
}

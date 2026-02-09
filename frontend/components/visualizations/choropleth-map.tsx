'use client'

// Choropleth Map Component - TASK-037
// Regional/area map with color-coded metrics using GeoJSON data

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ChoroplethMapProps, GeoJSONFeature } from './map-types'
import {
    validateGeoJSON,
    bboxToBounds,
    getColorForValue,
    generateColorSteps,
    DEFAULT_MAP_CONFIG,
    DEFAULT_TILE_PROVIDERS,
    DEFAULT_COLOR_SCALES,
    formatMapNumber
} from './map-utils'

// Dynamic imports for SSR safety
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div> }
)

const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
)

const GeoJSON = dynamic(
    () => import('react-leaflet').then((mod) => mod.GeoJSON),
    { ssr: false }
)

/**
 * Legend component for choropleth map
 */
function ChoroplethLegend({
    colorSteps,
    title
}: {
    colorSteps: Array<{ value: number; color: string }>
    title?: string
}) {
    return (
        <div className="absolute bottom-2 right-2 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border rounded p-3 shadow-lg">
            {title && (
                <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    {title}
                </div>
            )}
            <div className="space-y-1">
                {colorSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div
                            className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: step.color }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                            {formatMapNumber(step.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Choropleth Map Component
 * 
 * Features:
 * - GeoJSON region rendering
 * - Color-coded metrics by region
 * - Data join with GeoJSON properties
 * - Interactive tooltips
 * - Color scale legends
 * - Auto-fit bounds to GeoJSON
 * 
 * @param props - ChoroplethMapProps
 */
export function ChoroplethMap({
    data,
    geojsonData,
    config,
    height = '500px',
    width = '100%',
    className = '',
    onFeatureClick
}: ChoroplethMapProps) {
    const [isClient, setIsClient] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Validate GeoJSON
    const isValidGeoJSON = useMemo(() => {
        if (!validateGeoJSON(geojsonData)) {
            setError('Invalid GeoJSON data. Must be a FeatureCollection with at least one feature.')
            return false
        }
        setError(null)
        return true
    }, [geojsonData])

    // Merge config with defaults
    const mapConfig = useMemo(() => ({
        ...DEFAULT_MAP_CONFIG,
        ...config
    }), [config])

    // Determine color scale domain from data
    const colorScale = useMemo(() => {
        const values = Object.values(data).filter(v => typeof v === 'number' && !isNaN(v))

        if (values.length === 0) {
            return config.colorScale
        }

        const min = Math.min(...values)
        const max = Math.max(...values)

        return {
            ...config.colorScale,
            domain: config.colorScale.domain || [min, max]
        }
    }, [data, config.colorScale])

    // Generate legend steps
    const legendSteps = useMemo(() => {
        return generateColorSteps(colorScale, 5)
    }, [colorScale])

    // Calculate map center from GeoJSON bbox
    const mapCenter = useMemo(() => {
        if (config.center) {
            return config.center
        }

        if (geojsonData.bbox && geojsonData.bbox.length === 4) {
            const [minLng, minLat, maxLng, maxLat] = geojsonData.bbox
            return [(minLat + maxLat) / 2, (minLng + maxLng) / 2] as [number, number]
        }

        return DEFAULT_MAP_CONFIG.center
    }, [config.center, geojsonData.bbox])

    // GeoJSON style function
    const getFeatureStyle = (feature: GeoJSONFeature) => {
        const joinValue = feature.properties?.[config.joinProperty]
        const metricValue = joinValue !== undefined ? data[String(joinValue)] : undefined

        const fillColor = metricValue !== undefined && !isNaN(metricValue)
            ? getColorForValue(metricValue, colorScale)
            : '#cccccc' // Gray for no data

        return {
            fillColor,
            fillOpacity: 0.7,
            color: '#ffffff',
            weight: 1,
            opacity: 0.8
        }
    }

    // Feature hover effect
    const onEachFeature = (feature: GeoJSONFeature, layer: any) => {
        const joinValue = feature.properties?.[config.joinProperty]
        const metricValue = joinValue !== undefined ? data[String(joinValue)] : undefined

        // Tooltip content
        const tooltipContent = `
      <div style="padding: 8px;">
        <div style="font-weight: 600; margin-bottom: 4px;">
          ${feature.properties?.name || feature.properties?.[config.joinProperty] || 'Unknown'}
        </div>
        ${metricValue !== undefined && !isNaN(metricValue) ? `
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
            <span style="font-weight: 500;">${config.dataColumn}: </span>
            <span>${formatMapNumber(metricValue)}</span>
          </div>
        ` : `
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb; color: #9ca3af;">
            No data available
          </div>
        `}
      </div>
    `

        layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'leaflet-custom-tooltip'
        })

        // Click handler
        layer.on({
            click: () => {
                if (onFeatureClick) {
                    onFeatureClick(feature, metricValue)
                }
            },
            mouseover: (e: any) => {
                const layer = e.target
                layer.setStyle({
                    weight: 2,
                    fillOpacity: 0.9
                })
            },
            mouseout: (e: any) => {
                const layer = e.target
                layer.setStyle({
                    weight: 1,
                    fillOpacity: 0.7
                })
            }
        })
    }

    // SSR protection
    if (!isClient) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ height, width }}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Error state
    if (error || !isValidGeoJSON) {
        return (
            <div className={`relative ${className}`} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        {error || 'Invalid GeoJSON data'}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Empty data warning
    if (Object.keys(data).length === 0) {
        return (
            <div className={`relative ${className}`} style={{ height, width }}>
                <Alert>
                    <AlertDescription>
                        No metric data provided for choropleth map. Map will display regions without color coding.
                    </AlertDescription>
                </Alert>
                <div className="mt-2">
                    <MapContainer
                        center={mapCenter}
                        zoom={mapConfig.zoom || 4}
                        scrollWheelZoom={mapConfig.scrollWheelZoom}
                        style={{ height: typeof height === 'number' ? `${height - 60}px` : `calc(${height} - 60px)`, width: '100%', borderRadius: '0.5rem' }}
                    >
                        <TileLayer
                            url={DEFAULT_TILE_PROVIDERS.cartodb.url}
                            attribution={DEFAULT_TILE_PROVIDERS.cartodb.attribution}
                        />
                        <GeoJSON
                            data={geojsonData}
                            style={() => ({ fillColor: '#cccccc', fillOpacity: 0.5, color: '#ffffff', weight: 1 })}
                        />
                    </MapContainer>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`} style={{ height, width }}>
            <MapContainer
                center={mapCenter}
                zoom={mapConfig.zoom || 4}
                scrollWheelZoom={mapConfig.scrollWheelZoom}
                dragging={mapConfig.dragging}
                zoomControl={mapConfig.zoomControl}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
            >
                {/* Base map tiles */}
                <TileLayer
                    url={DEFAULT_TILE_PROVIDERS.cartodb.url}
                    attribution={DEFAULT_TILE_PROVIDERS.cartodb.attribution}
                    maxZoom={DEFAULT_TILE_PROVIDERS.cartodb.maxZoom}
                />

                {/* Choropleth GeoJSON layer */}
                <GeoJSON
                    data={geojsonData}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                />
            </MapContainer>

            {/* Legend */}
            {config.showLegend !== false && legendSteps.length > 0 && (
                <ChoroplethLegend
                    colorSteps={legendSteps}
                    title={config.dataColumn}
                />
            )}

            {/* Stats overlay */}
            <div className="absolute top-2 left-2 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border rounded px-3 py-1.5 text-xs shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Regions:</span>
                    <span className="font-medium">{geojsonData.features.length}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Data Points:</span>
                    <span className="font-medium">{Object.keys(data).length}</span>
                </div>
            </div>
        </div>
    )
}

/**
 * Choropleth Map with Error Boundary
 */
export default function ChoroplethMapWithErrorBoundary(props: ChoroplethMapProps) {
    const [hasError, setHasError] = useState(false)

    if (hasError) {
        return (
            <div className="relative" style={{ height: props.height || '500px', width: props.width || '100%' }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        Failed to render choropleth map. Please check your GeoJSON data and metric data.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    try {
        return <ChoroplethMap {...props} />
    } catch (error) {
        console.error('Choropleth map error:', error)
        setHasError(true)
        return null
    }
}

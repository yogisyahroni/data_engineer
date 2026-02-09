'use client'

// Map Configuration Sidebar - TASK-039
// UI untuk configure map settings, upload GeoJSON, dan column mapping

import React, { useState, useCallback } from 'react'
import { Upload, MapPin, Layers, Palette, Settings, FileJson, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MapConfigProps, GeoJSONFile, ChoroplethConfig, PointMapConfig } from './map-types'
import { DEFAULT_COLOR_SCALES } from './map-utils'

/**
 * GeoJSON file uploader component
 */
function GeoJSONUploader({
    onUpload,
    isUploading
}: {
    onUpload: (file: File) => Promise<void>
    isUploading: boolean
}) {
    const [dragActive, setDragActive] = useState(false)

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            if (file.name.endsWith('.geojson') || file.type === 'application/geo+json' || file.type === 'application/json') {
                onUpload(file)
            } else {
                alert('Please upload a valid GeoJSON file (.geojson or .json)')
            }
        }
    }, [onUpload])

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0])
        }
    }, [onUpload])

    return (
        <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
            />

            <div className="flex flex-col items-center gap-2">
                {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <p className="text-sm font-medium">
                    {isUploading ? 'Uploading...' : 'Drop GeoJSON file or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground">
                    Supports .geojson and .json files
                </p>
            </div>
        </div>
    )
}

/**
 * Map Configuration Sidebar Component
 * 
 * Features:
 * - Map type selection (base, choropleth, points)
 * - Column mapping for lat/lng or data joins
 * - GeoJSON file upload and management
 * - Color scale configuration
 * - Clustering and heatmap toggles
 * - Zoom and center controls
 * 
 * @param props - MapConfigProps
 */
export function MapConfig({
    mapType,
    config,
    onChange,
    availableColumns,
    geojsonFiles,
    onUploadGeoJSON
}: MapConfigProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    // Handle GeoJSON upload
    const handleGeoJSONUpload = async (file: File) => {
        if (!onUploadGeoJSON) {
            alert('GeoJSON upload is not configured')
            return
        }

        setIsUploading(true)
        setUploadError(null)

        try {
            await onUploadGeoJSON(file)
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload failed')
        } finally {
            setIsUploading(false)
        }
    }

    // Base map config
    const renderBaseConfig = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="zoom">Zoom Level: {config.zoom || 2}</Label>
                <Slider
                    id="zoom"
                    min={1}
                    max={18}
                    step={1}
                    value={[config.zoom || 2]}
                    onValueChange={(value) => onChange({ ...config, zoom: value[0] })}
                />
            </div>

            <div className="space-y-2">
                <Label>Controls</Label>
                <div className="flex items-center justify-between">
                    <span className="text-sm">Scroll Wheel Zoom</span>
                    <Switch
                        checked={config.scrollWheelZoom !== false}
                        onCheckedChange={(checked) => onChange({ ...config, scrollWheelZoom: checked })}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm">Dragging</span>
                    <Switch
                        checked={config.dragging !== false}
                        onCheckedChange={(checked) => onChange({ ...config, dragging: checked })}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm">Zoom Control</span>
                    <Switch
                        checked={config.zoomControl !== false}
                        onCheckedChange={(checked) => onChange({ ...config, zoomControl: checked })}
                    />
                </div>
            </div>
        </div>
    )

    // Choropleth config
    const renderChoroplethConfig = () => {
        const choroplethConfig = config as ChoroplethConfig

        return (
            <div className="space-y-4">
                {/* GeoJSON Selection */}
                <div className="space-y-2">
                    <Label htmlFor="geojson-select">GeoJSON File</Label>
                    <Select
                        value={choroplethConfig.geojsonFileId || ''}
                        onValueChange={(value) => onChange({ ...choroplethConfig, geojsonFileId: value })}
                    >
                        <SelectTrigger id="geojson-select">
                            <SelectValue placeholder="Select GeoJSON file" />
                        </SelectTrigger>
                        <SelectContent>
                            {geojsonFiles.map((file) => (
                                <SelectItem key={file.id} value={file.id}>
                                    {file.name} ({file.feature_count} features)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* GeoJSON Upload */}
                {onUploadGeoJSON && (
                    <div className="space-y-2">
                        <Label>Upload New GeoJSON</Label>
                        <GeoJSONUploader onUpload={handleGeoJSONUpload} isUploading={isUploading} />
                        {uploadError && (
                            <Alert variant="destructive">
                                <AlertDescription>{uploadError}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <Separator />

                {/* Data Column */}
                <div className="space-y-2">
                    <Label htmlFor="data-column">Metric Column</Label>
                    <Select
                        value={choroplethConfig.dataColumn || ''}
                        onValueChange={(value) => onChange({ ...choroplethConfig, dataColumn: value })}
                    >
                        <SelectTrigger id="data-column">
                            <SelectValue placeholder="Select metric column" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                    {col}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Join Property */}
                <div className="space-y-2">
                    <Label htmlFor="join-property">Join Property</Label>
                    <Input
                        id="join-property"
                        placeholder="e.g., id, name, code"
                        value={choroplethConfig.joinProperty || ''}
                        onChange={(e) => onChange({ ...choroplethConfig, joinProperty: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                        GeoJSON property to join with data
                    </p>
                </div>

                <Separator />

                {/* Color Scale */}
                <div className="space-y-2">
                    <Label htmlFor="color-scale">Color Scale</Label>
                    <Select
                        value={choroplethConfig.colorScale?.type || 'sequential'}
                        onValueChange={(value) => {
                            const scaleType = value as 'sequential' | 'diverging' | 'categorical'
                            const defaultScale = DEFAULT_COLOR_SCALES[
                                scaleType === 'sequential' ? 'sequential_blue' :
                                    scaleType === 'diverging' ? 'diverging_red_blue' :
                                        'sequential_blue'
                            ]
                            onChange({
                                ...choroplethConfig,
                                colorScale: { ...defaultScale, type: scaleType }
                            })
                        }}
                    >
                        <SelectTrigger id="color-scale">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sequential">Sequential (Low → High)</SelectItem>
                            <SelectItem value="diverging">Diverging (Low ← Mid → High)</SelectItem>
                            <SelectItem value="categorical">Categorical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm">Show Legend</span>
                    <Switch
                        checked={choroplethConfig.showLegend !== false}
                        onCheckedChange={(checked) => onChange({ ...choroplethConfig, showLegend: checked })}
                    />
                </div>

                <Separator />

                {renderBaseConfig()}
            </div>
        )
    }

    // Point map config
    const renderPointConfig = () => {
        const pointConfig = config as PointMapConfig

        return (
            <div className="space-y-4">
                {/* Coordinate Columns */}
                <div className="space-y-2">
                    <Label htmlFor="lat-column">Latitude Column</Label>
                    <Select
                        value={pointConfig.latColumn || ''}
                        onValueChange={(value) => onChange({ ...pointConfig, latColumn: value })}
                    >
                        <SelectTrigger id="lat-column">
                            <SelectValue placeholder="Select latitude column" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                    {col}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lng-column">Longitude Column</Label>
                    <Select
                        value={pointConfig.lngColumn || ''}
                        onValueChange={(value) => onChange({ ...pointConfig, lngColumn: value })}
                    >
                        <SelectTrigger id="lng-column">
                            <SelectValue placeholder="Select longitude column" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                    {col}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Separator />

                {/* Optional Columns */}
                <div className="space-y-2">
                    <Label htmlFor="value-column">Value Column (Optional)</Label>
                    <Select
                        value={pointConfig.valueColumn || 'none'}
                        onValueChange={(value) => onChange({ ...pointConfig, valueColumn: value === 'none' ? undefined : value })}
                    >
                        <SelectTrigger id="value-column">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                    {col}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="label-column">Label Column (Optional)</Label>
                    <Select
                        value={pointConfig.labelColumn || 'none'}
                        onValueChange={(value) => onChange({ ...pointConfig, labelColumn: value === 'none' ? undefined : value })}
                    >
                        <SelectTrigger id="label-column">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                    {col}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Separator />

                {/* Visualization Mode */}
                <div className="space-y-2">
                    <Label>Visualization Mode</Label>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Enable Clustering</span>
                        <Switch
                            checked={pointConfig.clustering === true}
                            onCheckedChange={(checked) => onChange({
                                ...pointConfig,
                                clustering: checked,
                                heatmap: checked ? false : pointConfig.heatmap // Disable heatmap if clustering enabled
                            })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Enable Heatmap</span>
                        <Switch
                            checked={pointConfig.heatmap === true}
                            onCheckedChange={(checked) => onChange({
                                ...pointConfig,
                                heatmap: checked,
                                clustering: checked ? false : pointConfig.clustering // Disable clustering if heatmap enabled
                            })}
                        />
                    </div>
                </div>

                {/* Heatmap Settings */}
                {pointConfig.heatmap && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="heatmap-radius">Heatmap Radius: {pointConfig.heatmapRadius || 25}</Label>
                            <Slider
                                id="heatmap-radius"
                                min={10}
                                max={50}
                                step={5}
                                value={[pointConfig.heatmapRadius || 25]}
                                onValueChange={(value) => onChange({ ...pointConfig, heatmapRadius: value[0] })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="heatmap-blur">Heatmap Blur: {pointConfig.heatmapBlur || 15}</Label>
                            <Slider
                                id="heatmap-blur"
                                min={5}
                                max={30}
                                step={5}
                                value={[pointConfig.heatmapBlur || 15]}
                                onValueChange={(value) => onChange({ ...pointConfig, heatmapBlur: value[0] })}
                            />
                        </div>
                    </>
                )}

                <Separator />

                {renderBaseConfig()}
            </div>
        )
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Map Configuration
                </CardTitle>
                <CardDescription>
                    Configure map settings and data mappings
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                    {mapType === 'base' && renderBaseConfig()}
                    {mapType === 'choropleth' && renderChoroplethConfig()}
                    {mapType === 'points' && renderPointConfig()}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export default MapConfig

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';

const PRESET_COLORS = [
    { name: 'Zinc', hex: '#52525b' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Violet', hex: '#7c3aed' }, // Default
];

const CHART_PALETTES = [
    { name: 'Default', colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'] },
    { name: 'Ocean', colors: ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'] },
    { name: 'Sunset', colors: ['#f43f5e', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e'] },
    { name: 'Corporate', colors: ['#0f172a', '#3b82f6', '#0ea5e9', '#64748b', '#ef4444', '#22c55e'] },
    { name: 'Vibrant', colors: ['#ff0080', '#7928ca', '#ff4d4d', '#F9CB28', '#0070f3', '#22c55e'] },
];

export default function ThemeSettingsPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState({
        primaryColor: '#7c3aed',
        radius: 0.5,
        fontFamily: 'Inter',
        radius: 0.5,
        fontFamily: 'Inter',
        chartPalette: undefined as string[] | undefined,
        darkMode: false
    });

    useEffect(() => {
        fetch(`/api/workspaces/${workspaceId}/theme`)
            .then(res => res.json())
            .then(data => {
                setConfig({
                    primaryColor: data.primaryColor || '#7c3aed',
                    radius: data.radius ?? 0.5,
                    fontFamily: data.fontFamily || 'Inter',
                    radius: data.radius ?? 0.5,
                    fontFamily: data.fontFamily || 'Inter',
                    chartPalette: data.chartPalette,
                    darkMode: data.darkMode ?? false
                });
            })
            .catch(err => toast.error("Failed to load theme"))
            .finally(() => setLoading(false));
    }, [workspaceId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/theme`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success("Theme updated successfully");
            // Force reload to apply changes (since provider fetches on mount)
            window.location.reload();
        } catch (error) {
            toast.error("Failed to update theme");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Theme & Branding</h2>
                <p className="text-muted-foreground">Customize the look and feel of your workspace.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Styles</CardTitle>
                        <CardDescription>Set the primary color and styling.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Primary Color */}
                        <div className="space-y-2">
                            <Label>Primary Color</Label>
                            <div className="flex flex-wrap gap-3">
                                {PRESET_COLORS.map(color => (
                                    <button
                                        key={color.hex}
                                        onClick={() => setConfig({ ...config, primaryColor: color.hex })}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${config.primaryColor === color.hex ? 'border-foreground scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {config.primaryColor === color.hex && <Check className="w-4 h-4 text-white mx-auto" />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center mt-2">
                                <Input
                                    type="color"
                                    value={config.primaryColor}
                                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <span className="text-sm font-mono text-muted-foreground uppercase">{config.primaryColor}</span>
                            </div>
                        </div>

                        {/* Radius */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>Corner Radius ({config.radius}rem)</Label>
                            </div>
                            <Slider
                                value={[config.radius]}
                                min={0}
                                max={1.0}
                                step={0.1}
                                onValueChange={(vals) => setConfig({ ...config, radius: vals[0] })}
                            />
                        </div>

                        {/* Font (Simple Input for now) */}
                        <div className="space-y-2">
                            <Label>Font Family</Label>
                            <Input
                                value={config.fontFamily}
                                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                                placeholder="Inter, sans-serif"
                            />
                            <p className="text-xs text-muted-foreground">Make sure the font is available or imported.</p>
                            <p className="text-xs text-muted-foreground">Make sure the font is available or imported.</p>
                        </div>

                        {/* Chart Palette */}
                        <div className="space-y-3">
                            <Label>Chart Palette</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {CHART_PALETTES.map(palette => (
                                    <div
                                        key={palette.name}
                                        className={`flex items-center p-2 rounded-md border cursor-pointer hover:bg-muted/50 ${JSON.stringify(config.chartPalette) === JSON.stringify(palette.colors) || (!config.chartPalette && palette.name === 'Default') ? 'border-primary bg-muted' : 'border-transparent'}`}
                                        onClick={() => setConfig({ ...config, chartPalette: palette.name === 'Default' ? undefined : palette.colors })}
                                    >
                                        <div className="w-24 text-sm font-medium">{palette.name}</div>
                                        <div className="flex-1 flex h-4 gap-1">
                                            {palette.colors.map(c => (
                                                <div key={c} className="h-full flex-1 rounded-sm" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        {(JSON.stringify(config.chartPalette) === JSON.stringify(palette.colors) || (!config.chartPalette && palette.name === 'Default')) && (
                                            <Check className="w-4 h-4 text-primary ml-2" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>

                {/* Live Preview */}
                <Card className="border-2 border-dashed">
                    <CardHeader>
                        <CardTitle>Live Preview</CardTitle>
                        <CardDescription>How components will look.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8" style={{
                        '--radius': `${config.radius}rem`,
                        '--primary-brand': config.primaryColor
                    } as React.CSSProperties}>

                        <div className="p-6 border rounded-[var(--radius)] shadow-sm bg-card">
                            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: config.fontFamily }}>Card Title</h3>
                            <p className="text-muted-foreground mb-4" style={{ fontFamily: config.fontFamily }}>This is a preview card content.</p>
                            <div className="flex gap-2">
                                <Button style={{ backgroundColor: config.primaryColor }}>Primary Action</Button>
                                <Button variant="outline">Secondary</Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-[var(--radius)] bg-muted flex items-center justify-center">Box</div>
                            <Input placeholder="Input field..." className="max-w-xs" />
                        </div>

                        {/* Chart Preview */}
                        <div className="space-y-2">
                            <Label>Chart Colors Preview</Label>
                            <div className="h-32 flex items-end justify-between gap-2 p-4 border rounded-[var(--radius)] bg-muted/20">
                                {(config.chartPalette || CHART_PALETTES[0].colors).map((color, i) => (
                                    <div
                                        key={i}
                                        className="w-full rounded-t-sm"
                                        style={{
                                            backgroundColor: color,
                                            height: `${30 + (i * 10)}%`,
                                            opacity: 0.9
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

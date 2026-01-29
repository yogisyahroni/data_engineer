
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import type { DataApp } from './page';

interface AppSettingsTabProps {
    app: DataApp;
    onUpdate: () => void;
}

export default function AppSettingsTab({ app, onUpdate }: AppSettingsTabProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: app.name,
        slug: app.slug,
        description: app.description || '',
        logoUrl: app.logoUrl || '',
        isPublished: app.isPublished,
    });

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`/api/apps/${app.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update app');
            }

            toast({ title: 'Success', description: 'App settings updated' });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update app',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/apps/${app.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete app');
            router.push('/apps');
            toast({ title: 'Deleted', description: 'App deleted successfully' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to delete app', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Configure the core details of your application.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">App Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="slug">URL Slug</Label>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md border border-input">
                                    app.insightengine.ai/
                                </span>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => handleChange('slug', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Internal sales portal for Q1 2024..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Branding & Visibility</CardTitle>
                        <CardDescription>Customize how your app looks and who can see it.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="logoUrl">Logo URL</Label>
                            <Input
                                id="logoUrl"
                                value={formData.logoUrl}
                                onChange={(e) => handleChange('logoUrl', e.target.value)}
                                placeholder="https://acme.com/logo.png"
                            />
                            <p className="text-xs text-muted-foreground">URL to your company logo (PNG/SVG recommended).</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Published Status</Label>
                                <div className="text-sm text-muted-foreground">
                                    When enabled, users with access can view the app.
                                </div>
                            </div>
                            <Switch
                                checked={formData.isPublished}
                                onCheckedChange={(checked) => handleChange('isPublished', checked)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-4">
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Deleting this app will restrict access for all users. The underlying dashboards will NOT be deleted.
                    </p>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete App
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

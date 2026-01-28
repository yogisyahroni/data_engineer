'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Copy, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
    resourceId: string;
    resourceType: 'DASHBOARD' | 'QUERY';
    trigger?: React.ReactNode;
}

export function ShareDialog({ resourceId, resourceType, trigger }: ShareDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/share/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resourceId, resourceType, password: password || undefined })
            });
            const data = await res.json();

            if (res.ok) {
                setGeneratedUrl(data.url);
                toast.success('Public link created');
            } else {
                toast.error(data.error || 'Failed to create link');
            }
        } catch (e) {
            toast.error('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Link copied to clipboard');
    };

    const embedCode = `<iframe src="${generatedUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline"><Link2 className="mr-2 h-4 w-4" /> Share</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share {resourceType === 'DASHBOARD' ? 'Dashboard' : 'Query'}</DialogTitle>
                    <DialogDescription>
                        Create a secure public link to share this resource externally.
                    </DialogDescription>
                </DialogHeader>

                {!generatedUrl ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Optional Password Protection</Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    className="pl-9"
                                    placeholder="Leave empty for public access"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleGenerate} disabled={isLoading}>
                            {isLoading ? 'Generating (NanoID)...' : 'Generate Public Link'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Public Link</Label>
                            <div className="flex items-center gap-2">
                                <Input readOnly value={generatedUrl} />
                                <Button size="icon" variant="outline" onClick={handleCopy}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Embed Code</Label>
                            <div className="relative">
                                <Input readOnly value={embedCode} className="pr-12 font-mono text-xs" />
                                <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-9 w-9" onClick={() => {
                                    navigator.clipboard.writeText(embedCode);
                                    toast.success('Code copied');
                                }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

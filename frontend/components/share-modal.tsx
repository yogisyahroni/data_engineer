'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Copy, Eye, Edit, Lock } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'query' | 'dashboard';
  resourceName: string;
  onShare: (email: string, permission: string) => Promise<void>;
  sharedWith?: Array<{ email: string; permission: string }>;
}

export function ShareModal({
  isOpen,
  onClose,
  resourceType,
  resourceName,
  onShare,
  sharedWith = [],
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleShare = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await onShare(email, permission);
      setEmail('');
      setPermission('view');
      console.log('[v0] Shared with:', email);
    } finally {
      setIsLoading(false);
    }
  };

  const generateShareLink = () => {
    const link = `${window.location.origin}/shared/${resourceType}/${Date.now()}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md shadow-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Share {resourceType === 'query' ? 'Query' : 'Dashboard'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Share <span className="font-medium">{resourceName}</span> with your team
        </p>

        {/* Share Link Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Share Link</label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareLink || 'Generate a shareable link'}
              className="text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={generateShareLink}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Share with Email */}
        <div className="space-y-3 pt-4 border-t border-border">
          <label className="text-sm font-medium text-foreground">
            Share with Email
          </label>

          <div className="flex gap-2">
            <Input
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleShare();
                }
              }}
            />
            <Select value={permission} onValueChange={(value: any) => setPermission(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    View
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Edit className="w-3 h-3" />
                    Edit
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!email.trim() || isLoading}
            onClick={handleShare}
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </Button>
        </div>

        {/* Shared With List */}
        {sharedWith.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <label className="text-sm font-medium text-foreground">Shared with</label>
            <div className="space-y-2">
              {sharedWith.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted"
                >
                  <div>
                    <p className="text-sm text-foreground">{item.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.permission}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { User, FileText, Share2, Edit, Save, Trash2, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  resource: {
    name: string;
    type: string;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  limit?: number;
  autoRefresh?: boolean;
}

export function ActivityFeed({ limit = 10, autoRefresh = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setActivities(data.activities.map((a: any) => ({
              id: a.id,
              type: a.type,
              user: {
                name: a.user?.name || 'Unknown',
                email: a.user?.email || '',
                avatar: a.user?.image,
              },
              resource: {
                name: a.resourceName || 'Unknown Resource',
                type: a.resourceType || 'unknown',
              },
              timestamp: new Date(a.createdAt),
              metadata: a.metadata ? (typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata) : {},
            })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [limit]); // Re-fetch only on limit change, not autoRefresh prop itself unless we implement polling

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'query_executed':
        return <FileText className="w-4 h-4" />;
      case 'query_shared':
        return <Share2 className="w-4 h-4" />;
      case 'query_edited':
        return <Edit className="w-4 h-4" />;
      case 'query_saved':
        return <Save className="w-4 h-4" />;
      case 'dashboard_created':
        return <Activity className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActivityMessage = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'query_executed':
        return `executed query`;
      case 'query_shared':
        return `shared query with ${activity.metadata?.sharedWith}`;
      case 'query_edited':
        return `edited query`;
      case 'query_saved':
        return `saved query`;
      case 'dashboard_created':
        return `created dashboard`;
      default:
        return `performed action`;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading activities...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No activities yet
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {getActivityIcon(activity.type)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                <span className="truncate">{activity.user.name}</span>
                {' '}
                <span className="text-muted-foreground">
                  {getActivityMessage(activity)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {activity.resource.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                })}
              </p>
            </div>

            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {activity.resource.type}
            </Badge>
          </div>
        ))
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { User, FileText, Share2, Edit, Save, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'query_executed' | 'query_saved' | 'query_shared' | 'query_edited' | 'dashboard_created';
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
    // Simulate fetching activities
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'query_executed',
        user: { name: 'You', email: 'you@example.com' },
        resource: { name: 'Top Customers by Sales', type: 'query' },
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        id: '2',
        type: 'query_shared',
        user: { name: 'John Doe', email: 'john@example.com' },
        resource: { name: 'Monthly Revenue Trend', type: 'query' },
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        metadata: { sharedWith: 'jane@example.com', permission: 'view' },
      },
      {
        id: '3',
        type: 'dashboard_created',
        user: { name: 'Jane Smith', email: 'jane@example.com' },
        resource: { name: 'Sales Overview', type: 'dashboard' },
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ];

    setActivities(mockActivities.slice(0, limit));
    setIsLoading(false);
    console.log('[v0] Activity feed loaded');
  }, [limit]);

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
        return <Share2 className="w-4 h-4" />;
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
        return `activity`;
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

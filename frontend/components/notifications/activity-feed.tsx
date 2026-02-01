'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivities, useWorkspaceActivities } from '@/hooks/use-activities';
import {
    Activity,
    User,
    Database,
    FileText,
    Settings,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityLog } from '@/lib/types/notifications';

interface ActivityFeedProps {
    className?: string;
    workspaceId?: string;
    limit?: number;
}

export function ActivityFeed({ className, workspaceId, limit = 50 }: ActivityFeedProps) {
    const [view, setView] = React.useState<'user' | 'workspace'>('user');

    const { activities: userActivities, isLoading: userLoading } = useActivities(limit, 0);
    const { activities: workspaceActivities, isLoading: workspaceLoading } = useWorkspaceActivities(
        workspaceId || '',
        limit,
        0
    );

    const activities = view === 'user' ? userActivities : workspaceActivities;
    const isLoading = view === 'user' ? userLoading : workspaceLoading;

    const getActionIcon = (action: ActivityLog['action']) => {
        const iconClass = 'w-4 h-4';
        switch (action) {
            case 'create':
                return <CheckCircle className={cn(iconClass, 'text-green-600')} />;
            case 'update':
                return <Settings className={cn(iconClass, 'text-blue-600')} />;
            case 'delete':
                return <XCircle className={cn(iconClass, 'text-red-600')} />;
            case 'view':
                return <FileText className={cn(iconClass, 'text-gray-600')} />;
            default:
                return <Activity className={cn(iconClass, 'text-gray-600')} />;
        }
    };

    const getEntityIcon = (entity: ActivityLog['entityType']) => {
        const iconClass = 'w-4 h-4';
        switch (entity) {
            case 'user':
                return <User className={cn(iconClass, 'text-purple-600')} />;
            case 'project':
                return <Database className={cn(iconClass, 'text-blue-600')} />;
            case 'datasource':
                return <Database className={cn(iconClass, 'text-green-600')} />;
            case 'query':
                return <FileText className={cn(iconClass, 'text-orange-600')} />;
            default:
                return <Activity className={cn(iconClass, 'text-gray-600')} />;
        }
    };

    const getActionColor = (action: ActivityLog['action']) => {
        switch (action) {
            case 'create':
                return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400';
            case 'update':
                return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
            case 'delete':
                return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400';
            case 'view':
                return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400';
            default:
                return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400';
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Activity Feed
                </CardTitle>
                <CardDescription>
                    Recent activity across your workspace
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Tabs value={view} onValueChange={(v) => setView(v as 'user' | 'workspace')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="user">
                            <User className="w-4 h-4 mr-2" />
                            My Activity
                        </TabsTrigger>
                        <TabsTrigger value="workspace" disabled={!workspaceId}>
                            <Database className="w-4 h-4 mr-2" />
                            Workspace
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={view} className="mt-0">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Activity className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
                                <p className="text-lg font-medium">No activity yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Activity will appear here as you work
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[600px]">
                                <div className="relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                                    <div className="space-y-6">
                                        {activities.map((activity, index) => (
                                            <div key={activity.id} className="relative flex gap-4">
                                                {/* Timeline dot */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 border-border">
                                                        {getActionIcon(activity.action)}
                                                    </div>
                                                </div>

                                                {/* Activity content */}
                                                <div className="flex-1 pb-6">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge
                                                                variant="secondary"
                                                                className={cn(
                                                                    'capitalize',
                                                                    getActionColor(activity.action)
                                                                )}
                                                            >
                                                                {activity.action}
                                                            </Badge>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                {getEntityIcon(activity.entityType)}
                                                                <span className="capitalize">
                                                                    {activity.entityType}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDistanceToNow(new Date(activity.createdAt), {
                                                                addSuffix: true,
                                                            })}
                                                        </div>
                                                    </div>

                                                    <p className="text-sm font-medium mb-1">
                                                        {activity.description}
                                                    </p>

                                                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                                        <div className="mt-2 p-3 rounded-md bg-muted/50 text-xs font-mono">
                                                            <pre className="overflow-x-auto">
                                                                {JSON.stringify(activity.metadata, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}

                                                    {view === 'workspace' && activity.userId && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            By user: {activity.userId}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

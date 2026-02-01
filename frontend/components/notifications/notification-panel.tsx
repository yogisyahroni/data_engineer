'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell, Check, CheckCheck, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/lib/types/notifications';

interface NotificationPanelProps {
    className?: string;
}

export function NotificationPanel({ className }: NotificationPanelProps) {
    const {
        notifications,
        total,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteReadNotifications,
    } = useNotifications(50, 0);

    const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

    const filteredNotifications = React.useMemo(() => {
        if (filter === 'unread') {
            return notifications.filter((n) => !n.isRead);
        }
        return notifications;
    }, [notifications, filter]);

    const getNotificationIcon = (type: Notification['type']) => {
        const iconClass = 'w-3 h-3 rounded-full';
        switch (type) {
            case 'success':
                return <div className={cn(iconClass, 'bg-green-500')} />;
            case 'error':
                return <div className={cn(iconClass, 'bg-red-500')} />;
            case 'warning':
                return <div className={cn(iconClass, 'bg-yellow-500')} />;
            case 'system':
                return <div className={cn(iconClass, 'bg-blue-500')} />;
            default:
                return <div className={cn(iconClass, 'bg-gray-500')} />;
        }
    };

    const getTypeColor = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return 'text-green-600 bg-green-50 dark:bg-green-950';
            case 'error':
                return 'text-red-600 bg-red-50 dark:bg-red-950';
            case 'warning':
                return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
            case 'system':
                return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
            default:
                return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                            {unreadCount > 0 && (
                                <Badge variant="destructive">{unreadCount}</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {total} total notifications
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAllAsRead()}
                            >
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Mark all read
                            </Button>
                        )}
                        {notifications.some((n) => n.isRead) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteReadNotifications()}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear read
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="all">
                            All ({notifications.length})
                        </TabsTrigger>
                        <TabsTrigger value="unread">
                            Unread ({unreadCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter} className="mt-0">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex gap-3 p-4 border rounded-lg">
                                        <Skeleton className="w-3 h-3 rounded-full flex-shrink-0 mt-1" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-1/4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Bell className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
                                <p className="text-lg font-medium">No notifications</p>
                                <p className="text-sm text-muted-foreground">
                                    {filter === 'unread'
                                        ? "You're all caught up!"
                                        : 'Notifications will appear here'}
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-2">
                                    {filteredNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                'group relative flex gap-3 rounded-lg border p-4 transition-colors',
                                                !notification.isRead && 'bg-accent/50 border-accent'
                                            )}
                                        >
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            <div className="flex-1 space-y-2 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <p className="font-semibold leading-none mb-1">
                                                            {notification.title}
                                                        </p>
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                'text-xs capitalize',
                                                                getTypeColor(notification.type)
                                                            )}
                                                        >
                                                            {notification.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!notification.isRead && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => markAsRead(notification.id)}
                                                                title="Mark as read"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => deleteNotification(notification.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-muted-foreground">
                                                    {notification.message}
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

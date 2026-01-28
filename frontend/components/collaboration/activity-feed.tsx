'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Bell, FilePlus, Activity as ActivityIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: { name: string; image?: string };
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/activity')
            .then(res => res.json())
            .then(data => {
                if (data.success) setActivities(data.activities);
            })
            .finally(() => setLoading(false));
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'COMMENT': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'MENTION': return <Bell className="w-4 h-4 text-orange-500" />;
            case 'CREATE': return <FilePlus className="w-4 h-4 text-green-500" />;
            default: return <ActivityIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4" />
                    Team Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[300px] p-4">
                    {loading ? (
                        <div className="text-center text-xs text-muted-foreground">Loading...</div>
                    ) : activities.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground">No recent activity</div>
                    ) : (
                        <div className="space-y-4">
                            {activities.map(item => (
                                <div key={item.id} className="flex gap-3 text-sm">
                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                        <AvatarImage src={item.user.image} />
                                        <AvatarFallback>{item.user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5">
                                        <p className="text-xs leading-none">
                                            <span className="font-semibold">{item.user.name}</span>
                                            {/* We can make description more robust later */}
                                        </p>
                                        <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                                            {getIcon(item.type)}
                                            <span>{item.description}</span>
                                            <span>•</span>
                                            <span>{formatDistanceToNow(new Date(item.createdAt))} ago</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

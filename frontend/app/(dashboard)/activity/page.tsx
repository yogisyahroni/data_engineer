import { ActivityFeed } from '@/components/notifications';

export const metadata = {
    title: 'Activity Feed | InsightEngine AI',
    description: 'View recent activity across your workspace',
};

export default function ActivityPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
                <p className="text-muted-foreground mt-2">
                    Track all actions and changes across your workspace in real-time
                </p>
            </div>
            <ActivityFeed />
        </div>
    );
}

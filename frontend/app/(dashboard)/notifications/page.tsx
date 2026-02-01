import { NotificationPanel } from '@/components/notifications';

export const metadata = {
    title: 'Notifications | InsightEngine AI',
    description: 'View and manage your notifications',
};

export default function NotificationsPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground mt-2">
                    Stay updated with real-time notifications about your workspace activity
                </p>
            </div>
            <NotificationPanel />
        </div>
    );
}

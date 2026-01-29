'use client';

import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

export function NotificationsSettings() {
    const { isSupported, subscription, isLoading, subscribeToPush, unsubscribeFromPush } = usePushNotifications();

    if (!isSupported) {
        return (
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Notifications</h2>
                <Alert variant="destructive">
                    <AlertDescription>
                        Push notifications are not supported in this browser. Please try Chrome, Edge, or Safari on macOS/iOS.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const handleTestNotification = async () => {
        try {
            if (!subscription) return;

            const payload = {
                userId: 'user-1', // In real app, this comes from session/context
                title: 'Test Notification',
                body: 'This is a test message from InsightEngine!',
                url: '/settings',
            };

            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Test notification sent!');
            } else {
                toast.error('Failed to send test notification');
            }
        } catch (error) {
            console.error('Test notification error:', error);
            toast.error('Error sending test notification');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Notifications</h2>

            <Card className="p-6 border border-border">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${subscription ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Push Notifications</h3>
                            <p className="text-sm text-muted-foreground">
                                {subscription
                                    ? 'Active. You will receive alerts and updates.'
                                    : 'Enable push notifications to stay updated.'}
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={subscription ? unsubscribeFromPush : subscribeToPush}
                        variant={subscription ? 'outline' : 'default'}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {subscription ? 'Disable' : 'Enable'}
                    </Button>
                </div>

                {subscription && (
                    <div className="mt-6 pt-6 border-t border-border">
                        <h4 className="text-sm font-medium mb-3">Troubleshooting</h4>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={handleTestNotification}>
                                Send Test Notification
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Note: If you don't see it, check your system's Focus Assist or Do Not Disturb settings.
                            </p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

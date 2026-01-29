import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            registerServiceWorker();
        } else {
            setIsLoading(false);
        }
    }, []);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToPush = useCallback(async () => {
        if (!VAPID_PUBLIC_KEY) {
            toast.error('VAPID public key not found');
            return;
        }

        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            // Allow permission request
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Notification permission denied');
                setIsLoading(false);
                return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            setSubscription(sub);

            // Send to backend
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sub),
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription on server');
            }

            toast.success('Notifications enabled!');
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
            toast.error('Failed to enable notifications');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const unsubscribeFromPush = useCallback(async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();

            if (sub) {
                await sub.unsubscribe();
                setSubscription(null);

                // Optional: Notify backend to delete (API logic handles 410, so lazy cleanup is fine)
                // But explicit endpoint could be better.
                toast.success('Notifications disabled');
            }
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            toast.error('Failed to disable notifications');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isSupported,
        subscription,
        isLoading,
        subscribeToPush,
        unsubscribeFromPush,
    };
}

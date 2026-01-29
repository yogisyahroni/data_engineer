import webpush from 'web-push';

if (!process.env.NEXT_PUBLIC_VAPID_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys are hidden or missing. Push notifications will fail.');
}

try {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@insightengine.ai',
        process.env.NEXT_PUBLIC_VAPID_KEY!,
        process.env.VAPID_PRIVATE_KEY!
    );
} catch (error) {
    console.error('Failed to set VAPID details', error);
}

export { webpush };

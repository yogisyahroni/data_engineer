import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'InsightEngine AI',
        short_name: 'InsightEngine',
        description: 'AI-Powered Business Intelligence Platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f172a',
        icons: [
            {
                src: '/icon-light-32x32.png',
                sizes: '32x32',
                type: 'image/png',
            },
            {
                src: '/icon-dark-32x32.png',
                sizes: '32x32',
                type: 'image/png',
            },
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    };
}

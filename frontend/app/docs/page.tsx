'use client';

import { useEffect } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

export default function ApiDocs() {
    useEffect(() => {
        // Dynamically load Swagger UI
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js';
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            window.SwaggerUIBundle({
                url: '/api/docs',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    // @ts-ignore
                    window.SwaggerUIBundle.presets.apis,
                    // @ts-ignore
                    window.SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
            });
        };
        document.body.appendChild(script);

        return () => {
            document.head.removeChild(link);
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                <h1 className="text-lg font-bold">API Documentation</h1>
                <a href="/settings" className="text-sm text-primary hover:underline">
                    Back to Settings
                </a>
            </div>
            <div id="swagger-ui" className="swagger-ui-wrapper bg-white dark:bg-gray-100" />
            <style jsx global>{`
        /* Dark mode overrides if needed, though Swagger UI is natively light */
        .swagger-ui .info .title { color: #333; }
      `}</style>
        </div>
    );
}

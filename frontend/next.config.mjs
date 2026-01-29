import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
        },
      },
      {
        urlPattern: /^\/api\/dashboards(\/.*)?$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-dashboards",
          expiration: { maxEntries: 50, maxAgeSeconds: 86400 }, // 1 day
        },
      },
      {
        urlPattern: /^\/api\/queries\/execute$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-queries",
          expiration: { maxEntries: 200, maxAgeSeconds: 3600 }, // 1 hour
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 60, maxAgeSeconds: 86400 * 30 }, // 30 days
        },
      },
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 365 },
        },
      }
    ]
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withPWA(nextConfig);

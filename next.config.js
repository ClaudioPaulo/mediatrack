/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure static export (no Node server): required to wrap the app
  // in Capacitor (iOS/Android), and lets you host the result on any static
  // CDN. Nothing here uses dynamic Server Components/Route Handlers.
  output: 'export',
  images: {
    // Vercel image optimization does not exist in static export or in
    // Capacitor; the <Image> components already use normal https domains.
    unoptimized: true,
  },
};

module.exports = nextConfig;

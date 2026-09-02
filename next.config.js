/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { formats: ['image/webp'], remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }, { protocol: 'https', hostname: 'picsum.photos' }] },
  async headers() {
    return [
      { source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.paystack.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://cqvjhgompqtxwmlbvxrl.supabase.co https://api.paystack.co; frame-src https://checkout.paystack.com;" }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
      { source: '/manifest.json', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      { source: '/icon-:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, immutable' }] },
    ];
  },
};
module.exports = nextConfig;

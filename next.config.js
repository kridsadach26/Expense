/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/t', destination: '/project-guest.html' }];
  },
};

module.exports = nextConfig;

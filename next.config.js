/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app is API-only: it exposes /api/* routes for the frontend and is
  // never rendered as a UI itself.
  reactStrictMode: true,
};

module.exports = nextConfig;

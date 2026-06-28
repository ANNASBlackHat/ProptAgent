/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve uploaded images from /public/uploads/**
  // Next.js serves /public/** as static files by default — no extra config needed.
  // The API route saves files into process.cwd()/public/uploads/<landlordId>/
  experimental: {
    serverComponentsExternalPackages: ['formidable'],
  },
};

export default nextConfig;


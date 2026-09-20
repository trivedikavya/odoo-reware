/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // All images (real uploads under /public/uploads and generated SVG
    // seed placeholders) are served locally from this same app, so there
    // is no benefit to the remote image optimization pipeline. Disabling
    // it also sidesteps a Next.js image-optimizer limitation where SVGs
    // are rejected as "not a valid image" even with dangerouslyAllowSVG.
    unoptimized: true,
  },
};

export default nextConfig;

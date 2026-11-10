import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings locally.
initOpenNextCloudflareForDev();

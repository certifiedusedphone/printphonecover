import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No Next.js page cache needed: every page reads live order/catalog data.
export default defineCloudflareConfig({});

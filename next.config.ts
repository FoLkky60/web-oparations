import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // NOTE: โหมด mock เป็น client-driven ล้วน (ใช้ usePathname + localStorage)
  // จึงปิด cacheComponents / partialPrefetching ที่เป็นการ optimize ฝั่ง server
  // ซึ่งขัดกับแอปที่ dynamic ทั้งหมด (ของเดิมคอมเมนต์ไว้):
  //   cacheComponents: true,
  //   partialPrefetching: true,
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

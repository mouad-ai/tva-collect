import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./uploads/**/*"]
  },
  experimental: {
    serverActions: {
      // Must comfortably exceed maxUploadSize (10 Mo/file) TIMES the number of
      // files a client can send in one go, plus multipart overhead — phone
      // photos are 3-12 Mo each and the public upload form accepts multiple
      // files. At exactly 10mb, two photos crashed the whole action with the
      // generic error page. Nginx caps the same requests at 25m
      // (deploy/nginx/tvacollect.conf client_max_body_size) — keep in sync.
      bodySizeLimit: "25mb"
    }
  }
};

export default nextConfig;

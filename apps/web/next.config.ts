import type { NextConfig } from 'next';
import { resolve } from 'path';
import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables from root .env file
const projectRoot = resolve(__dirname, '../..');
const rootEnvPath = resolve(projectRoot, '.env');

if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

const nextConfig: NextConfig = {
  // Proxy /api/v1 to Nest so relative NEXT_PUBLIC_API_BASE_URL works and no 404 on same-origin API path
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3001/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;

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
  /* config options here */
  // Environment variables with NEXT_PUBLIC_ prefix will be available in the browser
  // They can be defined in root .env file
};

export default nextConfig;

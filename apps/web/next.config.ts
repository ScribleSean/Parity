import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@parity/shared'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;

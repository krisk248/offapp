import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Added for YouTube thumbnails
        protocol: 'https',
        hostname: 'i.ytimg.com', 
        port: '',
        pathname: '/vi/**', 
      }
    ],
  },
};

export default nextConfig;

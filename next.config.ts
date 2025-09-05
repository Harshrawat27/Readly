import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // 👈 add this line
  },
  /* config options here */
  // api: {
  //   bodyParser: {
  //     sizeLimit: '50mb', // or '20mb', adjust as needed
  //   },
  // },
};

export default nextConfig;

import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
  experimental: {
    // Middleware mặc định chỉ giữ 10 MB request body. Các PDF của kho AI có thể
    // tới 200 MB; cộng thêm một ít dung lượng cho multipart metadata/boundary.
    middlewareClientMaxBodySize: '205mb',
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;

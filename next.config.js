/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          '**/System Volume Information/**',
          '**/$RECYCLE.BIN/**',
          '**/.next/**',
        ],
      };
    }

    return config;
  },
};

module.exports = nextConfig;

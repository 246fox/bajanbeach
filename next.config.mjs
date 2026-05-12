/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/beaches/casuarina-beach",
        destination: "/beaches/maxwell-beach",
        permanent: true
      },
      {
        source: "/beaches/belleplaine-beach",
        destination: "/beaches/cattlewash",
        permanent: true
      }
    ];
  }
};

export default nextConfig;

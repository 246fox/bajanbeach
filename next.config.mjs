/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseImageRemotePatterns = [];

if (typeof supabaseUrl === "string" && supabaseUrl.trim()) {
  try {
    const hostname = new URL(supabaseUrl.trim()).hostname;
    if (hostname) {
      supabaseImageRemotePatterns.push({
        protocol: "https",
        hostname,
        pathname: "/storage/v1/object/public/**"
      });
    }
  } catch {
    // leave patterns empty if URL is invalid
  }
}

const nextConfig = {
  images: {
    remotePatterns: supabaseImageRemotePatterns
  },
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

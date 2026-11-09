/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
    outputFileTracingIncludes: {
      "/api/pile": ["./data/resumes/**/*"],
      "/api/resume/*": ["./data/resumes/**/*"],
    },
  },
};

export default nextConfig;

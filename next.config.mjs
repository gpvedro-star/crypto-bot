/** @type {import('next').NextConfig} */
const nextConfig = {
  // The orchestrator writes generated projects to disk; keep them out of the bundler graph.
  serverExternalPackages: ["jpeg-js", "pngjs", "playwright-core"],
  outputFileTracingExcludes: { "*": ["./projects/**", "./templates/**"] },
};
export default nextConfig;

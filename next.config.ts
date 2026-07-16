import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubPages ? "/GomMap" : "",
  assetPrefix: isGithubPages ? "/GomMap" : "",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  outputFileTracingRoot: projectRoot,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? "/GomMap" : "",
  },
};

export default nextConfig;

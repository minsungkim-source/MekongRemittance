/** GitHub Pages serves this repository at /MekongRemittance, and serves it as
 *  static files -- so the app is exported, not run. */
const repo = 'MekongRemittance';
const isCI = process.env.GITHUB_ACTIONS === 'true';

/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  basePath: isCI ? `/${repo}` : '',
  assetPrefix: isCI ? `/${repo}/` : '',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

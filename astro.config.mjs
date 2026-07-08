// @ts-check
import { defineConfig } from 'astro/config';

// If deploying to a custom domain (peckenpaugh.us) or a user page
// (peckenpaugh.github.io), keep `site` and no `base`.
// For a project page (github.com/<you>/<repo>), set base: '/<repo>/'.
export default defineConfig({
  site: 'https://peckenpaugh.us',
  trailingSlash: 'always',
});

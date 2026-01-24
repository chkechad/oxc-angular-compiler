/**
 * PostCSS configuration for Bitwarden benchmark
 * Mirrors the configuration from bitwarden-clients/apps/web/postcss.config.js
 */

const path = require('path')

// Paths relative to bitwarden-clients
const BITWARDEN_ROOT = path.resolve(__dirname, '../../../../../bitwarden-clients')
const BITWARDEN_WEB = path.resolve(BITWARDEN_ROOT, 'apps/web')
const BITWARDEN_LIBS = path.resolve(BITWARDEN_ROOT, 'libs')

module.exports = {
  plugins: [
    // postcss-import for @import resolution
    require('postcss-import')({
      path: [path.resolve(BITWARDEN_LIBS), path.resolve(BITWARDEN_WEB, 'src/scss')],
    }),

    // postcss-nested for SCSS-like nesting
    require('postcss-nested'),

    // Tailwind CSS
    require('tailwindcss')({
      config: path.resolve(__dirname, 'tailwind.config.cjs'),
    }),

    // Autoprefixer for browser compatibility
    require('autoprefixer'),
  ],
}

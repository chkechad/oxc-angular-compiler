/**
 * Tailwind configuration for Bitwarden benchmark
 * Extends the base config from bitwarden-clients
 */

const path = require('path')

// Paths relative to bitwarden-clients
const BITWARDEN_ROOT = path.resolve(__dirname, '../../../../../bitwarden-clients')
const BITWARDEN_WEB = path.resolve(BITWARDEN_ROOT, 'apps/web')

// Try to load bitwarden's tailwind base config
let baseConfig
try {
  baseConfig = require(path.resolve(BITWARDEN_ROOT, 'libs/components/tailwind.config.base.js'))
} catch (e) {
  console.warn('Could not load bitwarden tailwind base config, using fallback')
  baseConfig = {
    prefix: 'tw-',
    content: [],
    corePlugins: { preflight: false },
    theme: {
      extend: {},
    },
    plugins: [],
  }
}

// Update content paths to point to bitwarden source
baseConfig.content = [
  path.resolve(BITWARDEN_WEB, 'src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/components/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/assets/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/auth/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/key-management-ui/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/vault/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/angular/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/tools/generator/components/src/**/*.{html,ts}'),
  path.resolve(BITWARDEN_ROOT, 'libs/tools/send/send-ui/src/**/*.{html,ts}'),
]

// Enable preflight for proper styling
baseConfig.corePlugins.preflight = true

module.exports = baseConfig

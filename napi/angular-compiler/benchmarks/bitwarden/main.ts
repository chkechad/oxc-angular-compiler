/**
 * Bitwarden Web Vault Entry Point for OXC Angular Benchmark
 *
 * This file bootstraps the Bitwarden web vault application using the OXC Angular compiler.
 */

// Zone.js must be imported before Angular
import 'zone.js'
// Core-js polyfills (matching bitwarden's polyfills.ts)
import 'core-js/stable'
import 'core-js/proposals/explicit-resource-management'
// Angular imports
import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

// Import the main AppModule from bitwarden
// Note: Path resolution is handled by vite-tsconfig-paths plugin
import { AppModule } from '../../../../../bitwarden-clients/apps/web/src/app/app.module'

// Enable production mode based on environment
if (import.meta.env.PROD) {
  enableProdMode()
}

// Set up error handling for stacktraces in development
if (import.meta.env.DEV) {
  Error.stackTraceLimit = Infinity
}

// Bootstrap the application
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => {
    console.log('[OXC Benchmark] Bitwarden Web Vault bootstrapped successfully')
  })
  .catch((err) => {
    console.error('[OXC Benchmark] Bootstrap failed:', err)
  })

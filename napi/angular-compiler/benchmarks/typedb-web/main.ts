/**
 * TypeDB Web Entry Point for OXC Angular Benchmark
 *
 * This file bootstraps the TypeDB web application using the OXC Angular compiler.
 */

// Zone.js must be imported before Angular
import 'zone.js'
// Import Angular compiler for JIT fallback
// This is needed because Angular libraries use partial compilation (ɵɵngDeclare*)
// and require the Angular Linker or JIT compiler to fully compile them
import '@angular/compiler'
// Angular imports
import { enableProdMode } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'

import { appConfig } from '../../../../../typedb-web/main/src/config'
// Import the root component and config from typedb-web
import { RootComponent } from '../../../../../typedb-web/main/src/root.component'

// Enable production mode based on environment
if (import.meta.env.PROD) {
  enableProdMode()
}

// Set up error handling for stacktraces in development
if (import.meta.env.DEV) {
  Error.stackTraceLimit = Infinity
}

// Bootstrap the application
bootstrapApplication(RootComponent, appConfig)
  .then(() => {
    console.log('[OXC Benchmark] TypeDB Web bootstrapped successfully')
  })
  .catch((err) => {
    console.error('[OXC Benchmark] Bootstrap failed:', err)
  })

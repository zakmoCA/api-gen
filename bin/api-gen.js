#!/usr/bin/env node
/* eslint-disable no-undef */
import('../src/cli/index.js').then(
  () => {},
  (err) => {
    console.error('api-gen crashed:', err?.stack || err)
    process.exit(1)
  }
)

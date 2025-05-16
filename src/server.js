import express from 'express'
import process from 'node:process'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import glob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_PATH = path.join(__dirname, 'data', 'data_store.json')
const ROUTES_DIR = path.join(__dirname, 'routes')
const PORT = process.env.PORT || 3000

const app = express()
app.use(express.json())

async function ensureDataStoreFile() {
  try {
    const content = await fs.readFile(DATA_PATH, 'utf8')
    if (!content.trim()) {
      await fs.writeFile(DATA_PATH, '{}', 'utf8')
      console.log('✅ Initialized empty data_store.json')
    } else {
      JSON.parse(content) // validate JSON
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(DATA_PATH, '{}', 'utf8')
      console.log('✅ Created missing data_store.json')
    } else {
      console.error('✖ Invalid data_store.json:', err.message)
      process.exit(1)
    }
  }
}

async function registerRoutes() {
  const routeFiles = await glob('*.js', { cwd: ROUTES_DIR })

  for (const file of routeFiles) {
    const routeName = path.basename(file, '.js')
    const modulePath = path.join(ROUTES_DIR, file)
    try {
      const routeModule = await import(pathToFileURL(modulePath).href)
      app.use(`/${routeName}`, routeModule.default)
      console.log(`✓ Registered route: /${routeName}`)
    } catch (err) {
      console.error(`✖ Failed to load route ${file}: ${err.message}`)
    }
  }
}

await ensureDataStoreFile()
await registerRoutes()

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
})

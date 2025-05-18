#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import kleur from 'kleur'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC = path.join(__dirname, 'src')
const MODELS_DIR = path.join(SRC, 'models')
const CONTROLLERS_DIR = path.join(SRC, 'controllers')
const ROUTES_DIR = path.join(SRC, 'routes')
const DATA_DIR = path.join(SRC, 'data')
const SCHEMA_FILE = path.join(DATA_DIR, 'data_schema.json')
const STORE_FILE = path.join(DATA_DIR, 'data_store.json')

const [,, resourceArg, ...extraArgs] = process.argv

if (!resourceArg) {
  console.log(kleur.red('✖ No resource name provided.'))
  process.exit(1)
}

const isInstance = resourceArg === 'instance'
const resource = isInstance ? extraArgs[0] : resourceArg
const targetIdOrName = isInstance ? extraArgs[1] : null
const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource
const plural = resource.endsWith('s') ? resource : resource + 's'

async function deleteFileIfExists(filePath) {
  try {
    await fs.unlink(filePath)
    console.log(kleur.red(`✗ Deleted: ${filePath}`))
  } catch { /* ignore */ }
}

async function removeFromSchema() {
  try {
    const schema = JSON.parse(await fs.readFile(SCHEMA_FILE, 'utf8'))
    if (schema[plural]) {
      delete schema[plural]
      await fs.writeFile(SCHEMA_FILE, JSON.stringify(schema, null, 2))
      console.log(kleur.yellow(`✎ Removed from schema: ${plural}`))
    }
  } catch { /* ignore */ }
}

async function removeFromStore() {
  try {
    const store = JSON.parse(await fs.readFile(STORE_FILE, 'utf8'))
    if (!store[plural]) return

    if (targetIdOrName) {
      const byId = store[plural].find(r => r.id === targetIdOrName)
      const byName = store[plural].find(r => r.name === targetIdOrName)
      const id = byId?.id || byName?.id
      if (!id) return console.log(kleur.red('✖ No matching instance found.'))
      store[plural] = store[plural].filter(r => r.id !== id)
      console.log(kleur.magenta(`🗑 Removed instance with id: ${id}`))
    } else {
      delete store[plural]
      console.log(kleur.red(`🧨 Removed all instances of: ${plural}`))
    }

    await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2))
  } catch (err) {
    console.error(kleur.red(`✖ Failed to modify data store: ${err.message}`))
  }
}

if (!isInstance) {
  await deleteFileIfExists(path.join(MODELS_DIR, `${singular}.js`))
  await deleteFileIfExists(path.join(CONTROLLERS_DIR, `${plural}Controller.js`))
  await deleteFileIfExists(path.join(ROUTES_DIR, `${plural}.js`))
  await removeFromSchema()
  await removeFromStore()
} else {
  if (!resource || !targetIdOrName) {
    console.log(kleur.red('✖ Usage: ./destroy_resource_updated.js instance <resource> <id|name>'))
    process.exit(1)
  }
  await removeFromStore()
}

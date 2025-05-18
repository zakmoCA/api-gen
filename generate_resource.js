#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import kleur from 'kleur'
import process from 'node:process'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SRC = path.join(__dirname, 'src')
const MODELS_DIR = path.join(SRC, 'models')
const CONTROLLERS_DIR = path.join(SRC, 'controllers')
const ROUTES_DIR = path.join(SRC, 'routes')
const DATA_DIR = path.join(SRC, 'data')
const STORE_FILE = path.join(DATA_DIR, 'data_store.json')
const SCHEMA_FILE = path.join(DATA_DIR, 'data_schema.json')
const BACKUPS_DIR = path.join(SRC, 'backups')

const program = new Command()
program
  .argument('<resource>', 'resource name (e.g. publisher) or new <resource> to create instance')
  .option('--fields <fields...>', 'field definitions in name:type format')
  .option('--method <method>', 'generate specific HTTP method')
  .option('--only <part>', 'only generate specific resource segment')
  .option('--force', 'extend schema if resource exists')
  .option('--reset', 'overwrite schema for resource')
  .parse(process.argv)

const options = program.opts()
const args = program.args
const isInstanceCreation = args[0] === 'new'
const resource = isInstanceCreation ? args[1] : args[0]
const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource
const plural = resource.endsWith('s') ? resource : resource + 's'
const cap = s => s[0].toUpperCase() + s.slice(1)

async function writeIfNotExists(file, content) {
  try {
    await fs.access(file)
    if (!options.force) return console.log(kleur.yellow(`✗ Skipped (exists): ${file}`))
  } catch {/*  */}
  await fs.writeFile(file, content)
  console.log(kleur.green(`✓ Created: ${file}`))
}

async function ensureBackup(schema) {
  await fs.mkdir(BACKUPS_DIR, { recursive: true })
  const backupPath = path.join(BACKUPS_DIR, 'schemaBackup.json')
  await fs.writeFile(backupPath, JSON.stringify(schema, null, 2))
  console.log(kleur.gray('⚠ schema backed up to src/backups/schemaBackup.json'))
}

async function updateSchema() {
  let schema = {}
  try {
    schema = JSON.parse(await fs.readFile(SCHEMA_FILE, 'utf8'))
  } catch {/*  */}
  const fields = options.fields || ['id:string', 'name:string']
  const newFields = Object.fromEntries(fields.map(f => f.split(':')))

  if (schema[plural]) {
    if (!options.force && !options.reset) {
      console.log(kleur.yellow(`✗ Skipped schema update: ${plural} already exists`))
      return
    }
    await ensureBackup(schema)
    schema[plural] = options.reset ? newFields : { ...schema[plural], ...newFields }
  } else {
    schema[plural] = newFields
  }
  await fs.writeFile(SCHEMA_FILE, JSON.stringify(schema, null, 2))
  console.log(kleur.green(`✓ Updated schema for: ${plural}`))
}

async function generateModel() {
  const modelPath = path.join(MODELS_DIR, `${singular}.js`)
  const fields = options.fields || ['id:string', 'name:string']
  const schemaFields = fields.map(f => `  ${f.split(':')[0]}: '${f.split(':')[1]}'`).join(',\n')
  const instanceFields = fields.filter(f => f.split(':')[0] !== 'id').map(f => {
    const key = f.split(':')[0]
    return key === 'name' ? `    name: data.name || "${cap(singular)} " + id` : `    ${key}: data.${key}`
  }).join(',\n')
  const content = `export const ${singular}Schema = {\n${schemaFields}\n}\n\nexport function create${cap(singular)}Instance(data) {\n  const id = crypto.randomUUID()\n  return {\n    id,\n${instanceFields}\n  }\n}`
  await writeIfNotExists(modelPath, content)
}

async function generateController() {
  const file = path.join(CONTROLLERS_DIR, `${plural}Controller.js`)
  const content = `import * as dataService from '../services/dataService.js'\nimport { create${cap(singular)}Instance } from '../models/${singular}.js'\n\nexport async function getAll${cap(plural)}(req, res) {\n  const data = await dataService.getAll('${plural}')\n  res.json(data)\n}\n\nexport async function get${cap(singular)}ById(req, res) {\n  const item = await dataService.getById('${plural}', req.params.id)\n  if (!item) return res.status(404).json({ error: 'Not found' })\n  res.json(item)\n}\n\nexport async function create${cap(singular)}(req, res) {\n  const item = create${cap(singular)}Instance(req.body)\n  const saved = await dataService.create('${plural}', item)\n  res.status(201).json(saved)\n}\n\nexport async function update${cap(singular)}(req, res) {\n  const updated = await dataService.update('${plural}', req.params.id, req.body)\n  if (!updated) return res.status(404).json({ error: 'Not found' })\n  res.json(updated)\n}\n\nexport async function delete${cap(singular)}(req, res) {\n  const deleted = await dataService.remove('${plural}', req.params.id)\n  if (!deleted) return res.status(404).json({ error: 'Not found' })\n  res.status(204).send()\n}`
  await writeIfNotExists(file, content)
}

async function generateRoute() {
  const file = path.join(ROUTES_DIR, `${plural}.js`)
  const content = `import express from 'express'\nimport * as controller from '../controllers/${plural}Controller.js'\n\nconst router = express.Router()\n\nrouter.get('/', controller.getAll${cap(plural)})\nrouter.get('/:id', controller.get${cap(singular)}ById)\nrouter.post('/', controller.create${cap(singular)})\nrouter.put('/:id', controller.update${cap(singular)})\nrouter.delete('/:id', controller.delete${cap(singular)})\n\nexport default router`
  await writeIfNotExists(file, content)
}

async function createResourceInstance() {
  let store = {}
  try {
    store = JSON.parse(await fs.readFile(STORE_FILE, 'utf8'))
  } catch {/*  */}

  const schema = JSON.parse(await fs.readFile(SCHEMA_FILE, 'utf8'))[plural]
  if (!schema) return console.log(kleur.red(`✖ No schema found for resource: ${plural}`))

  const id = crypto.randomUUID()
  const instance = { id }
  for (const [key] of Object.entries(schema)) {
    if (key === 'id') continue
    const arg = args.find(arg => arg.startsWith(`${key}:`))
    instance[key] = arg ? arg.split(':')[1].replace(/^"|"$/g, '') : ''
  }

  store[plural] = store[plural] || []
  store[plural].push(instance)
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2))
  console.log(kleur.green(`✓ Created instance in ${plural}: ${instance.id}`))
}

const main = async () => {
  if (isInstanceCreation) return await createResourceInstance()
  if (!options.only || options.only === 'model') {
    await generateModel()
    await updateSchema()
  }
  if (!options.only || options.only === 'controller') {
    await generateController()
  }
  if (!options.only || options.only === 'route') {
    await generateRoute()
  }
}
main()

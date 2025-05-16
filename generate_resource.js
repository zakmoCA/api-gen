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
const MODEL_DIR = path.join(SRC, 'models')
const CTRL_DIR = path.join(SRC, 'controllers')
const ROUTE_DIR = path.join(SRC, 'routes')
const DATA_DIR = path.join(SRC, 'data')
const STORE_FILE = path.join(DATA_DIR, 'data_store.json')
const SCHEMA_FILE = path.join(DATA_DIR, 'data_schema.json')
const BACKUP_DIR = path.join(SRC, 'backups')

const program = new Command()
program
  .argument('<resource>', 'name of the resource (e.g., dancers) or new <resource> for instance')
  .option('--fields <fields...>', 'field definitions in name:type format')
  .option('--method <method>', 'HTTP method to generate')
  .option('--only <part>', 'only generate a specific part')
  .option('--force', 'overwrite/extend schema')
  .option('--reset', 'replace schema entirely')
  .parse(process.argv)

const options = program.opts()
const args = program.args

const isInstanceCreation = args[0] === 'new'
const resource = isInstanceCreation ? args[1] : args[0]
const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource
const cap = s => s[0].toUpperCase() + s.slice(1)

async function writeIfNotExists(file, content) {
  try {
    await fs.access(file)
    if (!options.force) {
      console.log(kleur.yellow(`✗ Skipped (exists): ${file}`))
      return
    }
  } catch {/* */}
  await fs.writeFile(file, content)
  console.log(kleur.green(`✓ Created: ${file}`))
}

async function ensureBackup(schema) {
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  const backupPath = path.join(BACKUP_DIR, 'schemaBackup.json')
  await fs.writeFile(backupPath, JSON.stringify(schema, null, 2))
  console.log(kleur.gray('⚠ schema backed up to src/backups/schemaBackup.json'))
}

async function updateSchema() {
  let schema = {}
  try {
    schema = JSON.parse(await fs.readFile(SCHEMA_FILE, 'utf8'))
  } catch {/* */}

  const fields = options.fields || ['id:string', 'name:string']
  const newFields = Object.fromEntries(fields.map(f => f.split(':')))

  if (schema[resource]) {
    if (!options.force && !options.reset) {
      console.log(kleur.yellow(`✗ Skipped schema update: ${resource} already exists`))
      return
    }
    await ensureBackup(schema)
    schema[resource] = options.reset ? newFields : { ...schema[resource], ...newFields }
    console.log(kleur.green(`✓ Updated schema for: ${resource}`))
  } else {
    schema[resource] = newFields
    console.log(kleur.green(`✓ Created schema for: ${resource}`))
  }
  await fs.writeFile(SCHEMA_FILE, JSON.stringify(schema, null, 2))
}

async function generateModel() {
  const modelPath = path.join(MODEL_DIR, `${singular}.js`)
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
  const file = path.join(CTRL_DIR, `${resource}Controller.js`)
  const content = `import * as dataService from '../services/dataService.js'\nimport { create${cap(singular)}Instance } from '../models/${singular}.js'\n\nexport async function getAll${cap(resource)}(req, res) {\n  const data = await dataService.getAll('${resource}')\n  res.json(data)\n}\n\nexport async function get${cap(singular)}ById(req, res) {\n  const item = await dataService.getById('${resource}', req.params.id)\n  if (!item) return res.status(404).json({ error: 'Not found' })\n  res.json(item)\n}\n\nexport async function create${cap(singular)}(req, res) {\n  const item = create${cap(singular)}Instance(req.body)\n  const saved = await dataService.create('${resource}', item)\n  res.status(201).json(saved)\n}\n\nexport async function update${cap(singular)}(req, res) {\n  const updated = await dataService.update('${resource}', req.params.id, req.body)\n  if (!updated) return res.status(404).json({ error: 'Not found' })\n  res.json(updated)\n}\n\nexport async function delete${cap(singular)}(req, res) {\n  const deleted = await dataService.remove('${resource}', req.params.id)\n  if (!deleted) return res.status(404).json({ error: 'Not found' })\n  res.status(204).send()\n}`
  await writeIfNotExists(file, content)
}

async function generateRoute() {
  const file = path.join(ROUTE_DIR, `${resource}.js`)
  const content = `import express from 'express'\nimport * as controller from '../controllers/${resource}Controller.js'\n\nconst router = express.Router()\n\nrouter.get('/', controller.getAll${cap(resource)})\nrouter.get('/:id', controller.get${cap(singular)}ById)\nrouter.post('/', controller.create${cap(singular)})\nrouter.put('/:id', controller.update${cap(singular)})\nrouter.delete('/:id', controller.delete${cap(singular)})\n\nexport default router`
  await writeIfNotExists(file, content)
}

async function createResourceInstance() {
  let store = {}
  try {
    store = JSON.parse(await fs.readFile(STORE_FILE, 'utf8'))
  } catch {/* */}

  const schema = JSON.parse(await fs.readFile(SCHEMA_FILE, 'utf8'))[resource]
  if (!schema) return console.log(kleur.red(`✖ No schema found for resource: ${resource}`))

  const id = crypto.randomUUID()
  const instance = { id }
  for (const [key] of Object.entries(schema)) {
    if (key === 'id') continue
    const arg = args.find(arg => arg.startsWith(`${key}:`))
    instance[key] = arg ? arg.split(':')[1].replace(/^"|"$/g, '') : ''
  }

  store[resource] = store[resource] || []
  store[resource].push(instance)
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2))
  console.log(kleur.green(`✓ Created instance in ${resource}: ${instance.id}`))
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

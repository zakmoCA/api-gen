/* eslint-disable no-undef */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import kleur from 'kleur'
import { randomUUID } from 'node:crypto'
import { parseKvArgs } from '../utils/kvArgs.js'


const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)


export const PKG_SRC  = path.resolve(__dirname, '..')
export const PKG_ROOT = path.resolve(__dirname, '..', '..')

export const TARGET_ROOT = process.cwd()

export const SRC              = path.join(TARGET_ROOT, 'src')
export const MODELS_DIR       = path.join(SRC, 'models')
export const CONTROLLERS_DIR  = path.join(SRC, 'controllers')
export const ROUTES_DIR       = path.join(SRC, 'routes')
export const SERVICES_DIR     = path.join(SRC, 'services')
export const DATA_DIR         = path.join(SRC, 'data')
export const STORE_FILE       = path.join(DATA_DIR, 'data_store.json')
export const SCHEMA_FILE      = path.join(DATA_DIR, 'data_schema.json')
// export const BACKUPS_DIR   = path.join(SRC, 'backups')
export const SERVER_FILE      = path.join(SRC, 'server.js')

// ---------------------------------------------------------------------------
// some utils
// ---------------------------------------------------------------------------
const exists  = p => fs.stat(p).then(() => true).catch(() => false)
const cap     = s => (s ? s[0].toUpperCase() + s.slice(1) : s)

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function readJson(p, fallback = {}) {
  try {
    const t = await fs.readFile(p, 'utf8')
    return t.trim() ? JSON.parse(t) : fallback
  } catch (e) {
    if (e.code === 'ENOENT') return fallback
    throw e
  }
}

async function writeJson(p, data) {
  await ensureDir(path.dirname(p))
  await fs.writeFile(p, JSON.stringify(data, null, 2))
}

function inferType(v) {
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'number')  return 'number'
  return 'string'
}
function defaultByType(t) {
  if (t === 'boolean') return false
  if (t === 'number')  return null
  return ''
}

// ---------------------------------------------------------------------------
// package.json patching in the TARGET project
// this so as i/user shouldnt have to manually edit target project repo for it and should be handled by the code-gen
// ---------------------------------------------------------------------------
async function patchPackageJson({ addServerScript = false, addExpressFastGlob = false } = {}) {
  const pkgPath = path.join(TARGET_ROOT, 'package.json')
  let pkg = await readJson(pkgPath, null)

  // create a minimal one if !package.json
  if (!pkg) {
    pkg = {
      name: path.basename(TARGET_ROOT) || 'generated-app',
      version: '1.0.0',
      type: 'module',
      scripts: {},
      dependencies: {}
    }
    console.log(kleur.yellow(`ℹ Created minimal package.json in ${path.relative(TARGET_ROOT, pkgPath) || 'package.json'}`))
  }

  // ensure our generated files use ESM imports
  if (!pkg.type) {
    pkg.type = 'module'
    console.log(kleur.yellow('ℹ Set `"type": "module"` in package.json (required for ESM imports).'))
  } else if (pkg.type !== 'module') {
    console.log(kleur.red('⚠ Your project is CommonJS ("type" is not "module"). The generated ESM files may not run.'))
  }

  // add start script for the generated server
  if (addServerScript) {
    pkg.scripts = pkg.scripts || {}
    if (!pkg.scripts.start) {
      pkg.scripts.start = 'node src/server.js'
      console.log(kleur.yellow('ℹ Added `"start": "node src/server.js"` to package.json scripts.'))
    }
  }

  // merge dependencies
  if (addExpressFastGlob) {
    pkg.dependencies = pkg.dependencies || {}
    if (!pkg.dependencies.express) {

        pkg.dependencies.express = '^5.1.0'
      console.log(kleur.yellow('ℹ Added "express" dependency to package.json.'))
    }
    if (!pkg.dependencies['fast-glob']) {
      pkg.dependencies['fast-glob'] = '^3.3.3'
      console.log(kleur.yellow('ℹ Added "fast-glob" dependency to package.json.'))
    }
  }

  await writeJson(pkgPath, pkg)
}

// ---------------------------------------------------------------------------
// schema helper
// ---------------------------------------------------------------------------
async function ensureSchemaFromFields(plural, fieldsObj) {
  const schema = await readJson(SCHEMA_FILE, {})
  if (!schema[plural]) {
    const fieldMap = { id: 'string' }
    // infer types from provided values
    for (const [k, v] of Object.entries(fieldsObj)) fieldMap[k] = inferType(v)
    schema[plural] = fieldMap
    await writeJson(SCHEMA_FILE, schema)
    console.log(kleur.yellow(`ℹ Created schema for "${plural}" in ${path.relative(TARGET_ROOT, SCHEMA_FILE)}`))
  }
  return (await readJson(SCHEMA_FILE, {}))[plural]
}

// ---------------------------------------------------------------------------
// build scaffold concerning if !data-service in target repo
// ---------------------------------------------------------------------------
async function ensureDataService() {
  const file = path.join(SERVICES_DIR, 'dataService.js')
  if (await exists(file)) return
  await ensureDir(SERVICES_DIR)

  const content = `import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '../data')
const STORE_FILE = path.join(DATA_DIR, 'data_store.json')

async function ensureDataDir(){ await mkdir(DATA_DIR, { recursive: true }) }

async function load(){
  try {
    const text = await readFile(STORE_FILE, 'utf8')
    return text.trim() ? JSON.parse(text) : {}
  } catch (err) {
    if (err.code === 'ENOENT') return {}
    throw err
  }
}

async function save(data){
  await ensureDataDir()
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2))
}

export async function getAll(resource){
  const data = await load()
  return data[resource] || []
}

export async function getById(resource, id){
  const data = await load()
  return (data[resource] || []).find(item => item.id === id)
}

export async function create(resource, item){
  const data = await load()
  if (!data[resource]) data[resource] = []
  data[resource].push(item)
  await save(data)
  return item
}

export async function update(resource, id, newData){
  const data = await load()
  const items = data[resource]
  if (!items) return null
  const index = items.findIndex(item => item.id === id)
  if (index === -1) return null
  data[resource][index] = { ...items[index], ...newData, id }
  await save(data)
  return data[resource][index]
}

export async function remove(resource, id){
  const data = await load()
  const items = data[resource]
  if (!items) return false
  const filtered = items.filter(item => item.id !== id)
  if (filtered.length === items.length) return false
  data[resource] = filtered
  await save(data)
  return true
}
`
  await fs.writeFile(file, content)
  console.log(kleur.green(`✓ ${path.relative(TARGET_ROOT, file)}`))
}

// ---------------------------------------------------------------------------
// MVC scaffolding — model, controller, route || designed in keeping with desire for idempotent operations - what this mens below
// ---------------------------------------------------------------------------
//      idempotent-structure brief and rationale
//      -----------------------------------------
//   - user can run this generator again with the same args, and after the first run
//     the project stays the same (no duplicate files, no extra lines)
// achieved by (brief):
//   - create-if-missing approach: only write files that don’t exist yet
//   - merge-dont-overwrite approach: extend schema instead of nuking it
//   - no-op if identical: if everything already matches, do nothing
// rationale:
//   - safe to re-run from scripts/CI without “n+1” side effects on like-args recursive executions
//   - can retry commands without fear of breaking edits which need during dev but also for the packages prudent functionality for any user later

// lazy approach to proactively handling these above concerns for idempotence for now, more robust exception handling tbc after mvp

// ---------------------------------------------------------------------------
async function scaffoldMVC(singular, plural, fieldsDef = ['id:string','name:string']) {
  const modelPath       = path.join(MODELS_DIR, `${singular}.js`)
  const controllerPath  = path.join(CONTROLLERS_DIR, `${plural}Controller.js`)
  const routePath       = path.join(ROUTES_DIR, `${plural}.js`)

  if (!(await exists(modelPath))) {
    await ensureDir(MODELS_DIR)
    const schemaFields = fieldsDef
      .map(f => `  ${f.split(':')[0]}: '${f.split(':')[1]}'`)
      .join(',\n')

    const instanceFields = fieldsDef
      .filter(f => f.split(':')[0] !== 'id')
      .map(f => {
        const k = f.split(':')[0]
        return k === 'name'
          ? `    name: data.name || "${cap(singular)} " + id`
          : `    ${k}: data.${k}`
      }).join(',\n')

    // including randomUUID import to avoid ReferenceError in ESM
    const model = `import { randomUUID } from 'node:crypto'

export const ${singular}Schema = {
${schemaFields}
}

export function create${cap(singular)}Instance(data){
  const id = randomUUID()
  return {
    id,
${instanceFields}
  }
}
`
    await fs.writeFile(modelPath, model)
    console.log(kleur.green(`✓ ${path.relative(TARGET_ROOT, modelPath)}`))
  }

  if (!(await exists(controllerPath))) {
    await ensureDir(CONTROLLERS_DIR)
    const controller = `import * as dataService from '../services/dataService.js'
import { create${cap(singular)}Instance } from '../models/${singular}.js'

export async function getAll${cap(plural)}(req,res){
  const rows = await dataService.getAll('${plural}')
  res.json(rows)
}

export async function get${cap(singular)}ById(req,res){
  const it = await dataService.getById('${plural}', req.params.id)
  if (!it) return res.status(404).json({ error: 'Not found' })
  res.json(it)
}

export async function create${cap(singular)}(req,res){
  const it = create${cap(singular)}Instance(req.body)
  const saved = await dataService.create('${plural}', it)
  res.status(201).json(saved)
}

export async function update${cap(singular)}(req,res){
  const up = await dataService.update('${plural}', req.params.id, req.body)
  if (!up) return res.status(404).json({ error: 'Not found' })
  res.json(up)
}

export async function delete${cap(singular)}(req,res){
  const ok = await dataService.remove('${plural}', req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
}
`
    await fs.writeFile(controllerPath, controller)
    console.log(kleur.green(`✓ ${path.relative(TARGET_ROOT, controllerPath)}`))
  }

  if (!(await exists(routePath))) {
    await ensureDir(ROUTES_DIR)
    const route = `import express from 'express'
import * as controller from '../controllers/${plural}Controller.js'

const router = express.Router()

router.get('/', controller.getAll${cap(plural)})
router.get('/:id', controller.get${cap(singular)}ById)
router.post('/', controller.create${cap(singular)})
router.put('/:id', controller.update${cap(singular)})
router.delete('/:id', controller.delete${cap(singular)})

export default router
`
    await fs.writeFile(routePath, route)
    console.log(kleur.green(`✓ ${path.relative(TARGET_ROOT, routePath)}`))
  }
}

// ---------------------------------------------------------------------------
// optional server scaffold for posterity, always mostly boilerplate so make sense to handle a starter with code-gen too 
// ---------------------------------------------------------------------------
async function ensureServer() {
  if (await exists(SERVER_FILE)) return
  await ensureDir(SRC)
  const server = `import express from 'express'
import process from 'node:process'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import glob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
const DATA_PATH = path.join(DATA_DIR, 'data_store.json')
const ROUTES_DIR = path.join(__dirname, 'routes')
const PORT = process.env.PORT || 3000

const app = express()
app.use(express.json())

async function ensureDataStoreFile(){
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const content = await fs.readFile(DATA_PATH, 'utf8')
    if (!content.trim()) {
      await fs.writeFile(DATA_PATH, '{}', 'utf8')
      console.log('✅ Initialized empty data_store.json')
    } else {
      JSON.parse(content)
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(DATA_PATH, '{}', 'utf8')
      console.log('✅ Created missing data_store.json')
    } else {
      console.error('✖ Invalid data_store.json:', err.message)
      process.exit(1)
    }
  }
}

async function registerRoutes(){
  const files = await glob('*.js', { cwd: ROUTES_DIR })
  for (const f of files) {
    const modulePath = path.join(ROUTES_DIR, f)
    try {
      const mod = await import(pathToFileURL(modulePath).href)
      const mount = '/' + path.basename(f, '.js')
      app.use(mount, mod.default)
      console.log(\`✓ Registered route: \${mount}\`)
    } catch (err) {
      console.error(\`✖ Failed to load route \${f}: \${err.message}\`)
    }
  }
}

await ensureDataStoreFile()
await registerRoutes()

app.listen(PORT, () => console.log(\`🚀 Server http://localhost:\${PORT}\`))
`
  await fs.writeFile(SERVER_FILE, server)
  console.log(kleur.green(`✓ ${path.relative(TARGET_ROOT, SERVER_FILE)}`))
  console.log(kleur.yellow('ℹ This server needs "express" and "fast-glob" in your target project.'))
  console.log(kleur.yellow('  I patched package.json for you run: npm i'))
}

// ---------------------------------------------------------------------------
// commander program helper logic
// ---------------------------------------------------------------------------
const program = new Command()
program
  .name('api-gen')
  .description('Scaffold resources & instances into the current project')

// 1) define/extend a resource schema + MVC files and/or with optional server
program
  .command('resource')
  .argument('<name>', 'singular or plural')
  .option('--fields <fields...>', 'name:type pairs (default: id:string name:string)')
  .option('--init-server', 'also scaffold src/server.js if missing and patch package.json')
  .action(async (name, opts) => {
    const singular = name.endsWith('s') ? name.slice(0, -1) : name
    const plural   = name.endsWith('s') ? name : name + 's'
    const def      = Array.isArray(opts.fields) && opts.fields.length ? opts.fields : ['id:string', 'name:string']

    await ensureDir(DATA_DIR)
    await ensureDataService()

    // update schema with idempotence 
    const schema = await readJson(SCHEMA_FILE, {})
    const next = { ...(schema[plural] || {}) }
    for (const f of def) {
      const [k, t] = f.split(':')
      next[k] = t || 'string'
    }
    await writeJson(SCHEMA_FILE, { ...schema, [plural]: next })
    console.log(kleur.green(`✓ schema updated: ${path.relative(TARGET_ROOT, SCHEMA_FILE)} (${plural})`))

    await scaffoldMVC(singular, plural, def)

    if (opts.initServer) {
      await ensureServer()
      await patchPackageJson({ addServerScript: true, addExpressFastGlob: true })
      console.log(kleur.gray('npm i          # install dependencies added to package.json'))
      console.log(kleur.gray('npm start      # runs node src/server.js'))
    }
  })

// 2) create an instance (infers schema if missing) and/or with optional server 
program
  .command('new')
  .description('Create an instance, inferring schema if needed')
  .argument('<resource>', 'singular or plural')
  .argument('[pairs...]', 'key:value or key="multi word" (e.g., name:"Tom Hardy" age:47)')
  .option('--init-server', 'also scaffold src/server.js if missing and patch package.json')
  .action(async (resource, pairs = [], opts) => {
    const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource
    const plural   = resource.endsWith('s') ? resource : resource + 's'
    const provided = parseKvArgs(pairs)
    if (Object.keys(provided).length === 0) {
      console.log(kleur.red('✗ Provide at least one key:value pair'))
      process.exit(1)
    }

    await ensureDir(DATA_DIR)
    await ensureDataService()

    const schemaForPlural = await ensureSchemaFromFields(plural, provided)
    await scaffoldMVC(singular, plural, Object.entries(schemaForPlural).map(([k, t]) => `${k}:${t}`))

    if (opts.initServer) {
      await ensureServer()
      await patchPackageJson({ addServerScript: true, addExpressFastGlob: true })
      console.log(kleur.gray('npm i          # install dependencies added to package.json'))
      console.log(kleur.gray('npm start      # runs node src/server.js'))
    }

    // build + save instance
    const store = await readJson(STORE_FILE, {})
    const id = randomUUID()
    const now = new Date().toISOString()
    const instance = { id, created_at: now, updated_at: now }

    for (const [k, t] of Object.entries(schemaForPlural)) {
      if (k === 'id') continue
      instance[k] = Object.prototype.hasOwnProperty.call(provided, k) ? provided[k] : defaultByType(t)
    }

    store[plural] = store[plural] || []
    store[plural].push(instance)
    await writeJson(STORE_FILE, store)

    console.log(kleur.green(`✓ created ${singular} #${id} in ${plural}`))
    console.log(kleur.gray(JSON.stringify(instance, null, 2)))
  })

  await program.parseAsync()


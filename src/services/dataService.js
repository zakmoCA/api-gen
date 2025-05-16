import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '../data')
const STORE_FILE = path.join(DATA_DIR, 'data_store.json')

async function load() {
  try {
    const text = await readFile(STORE_FILE, 'utf8')
    return text.trim() ? JSON.parse(text) : {}
  } catch (err) {
    if (err.code === 'ENOENT') return {}
    throw err
  }
}

async function save(data) {
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2))
}

export async function getAll(resource) {
  const data = await load()
  return data[resource] || []
}

export async function getById(resource, id) {
  const data = await load()
  return (data[resource] || []).find(item => item.id === id)
}

export async function create(resource, item) {
  const data = await load()
  if (!data[resource]) data[resource] = []
  data[resource].push(item)
  await save(data)
  return item
}

export async function update(resource, id, newData) {
  const data = await load()
  const items = data[resource]
  if (!items) return null
  const index = items.findIndex(item => item.id === id)
  if (index === -1) return null
  data[resource][index] = { ...items[index], ...newData, id }
  await save(data)
  return data[resource][index]
}

export async function remove(resource, id) {
  const data = await load()
  const items = data[resource]
  if (!items) return false
  const filtered = items.filter(item => item.id !== id)
  if (filtered.length === items.length) return false
  data[resource] = filtered
  await save(data)
  return true
}

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_FILE = join(__dirname, 'data-store.json')

export async function readData() {
  const data = await readFile(DATA_FILE, 'utf8')
  return JSON.parse(data)
}

export async function writeData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}
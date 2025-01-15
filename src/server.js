/* eslint-disable no-undef */
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readData, writeData } from './data-operations.js'
import { access, writeFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(express.json())

// local store
const DATA_FILE = join(__dirname, 'data-store.json')

// init file if !file
async function initDataFile() {
  try {
      await access(DATA_FILE)
  } catch {
      // create initial books resource
      const initialData = {
          books: [
              { id: '1', title: 'Test Book 1', author: 'Test Author 1' }
          ]
      }
      await writeFile(DATA_FILE, JSON.stringify(initialData, null, 2))
  }
}


// generic CRUD for a resource
app.get('/:resource', async (req, res) => {
  try {
    const data = await readData()
    const resource = req.params.resource
    res.json(data[resource] || [])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/:resource/:id', async (req, res) => {
  try {
    const data = await readData()
    const { resource, id } = req.params
    const item = (data[resource] || []).find(item => item.id === id)
    if (!item) return res.status(404).json({ error: 'not found' })
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/:resource', async (req, res) => {
  try {
    const data = await readData()
    const resource = req.params.resource
    if (!data[resource]) data[resource] = []
    const newItem = { ...req.body, id: Date.now().toString() }
    data[resource].push(newItem)
    await writeData(data)
    res.status(201).json(newItem)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/:resource/:id', async (req, res) => {
  try {
    const data = await readData()
    const { resource, id } = req.params
    if (!data[resource]) return res.status(404).json({ error: 'resource not found' })
    const index = data[resource].findIndex(item => item.id === id)
    if (index === -1) return res.status(404).json({ error: 'item not found' })
    data[resource][index] = { ...req.body, id }
    await writeData(data)
    res.json(data[resource][index])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/:resource/:id', async (req, res) => {
  try {
    const data = await readData()
    const { resource, id } = req.params
    if (!data[resource]) return res.status(404).json({ error: 'resource not found' })
    data[resource] = data[resource].filter(item => item.id !== id)
    await writeData(data)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// serve
const PORT = process.env.PORT || 3000
initDataFile().then(() => {
  
    app.get('/modelRouteTest2/:id', async (req, res) => {
      try {
        const data = await readData()
        const item = (data.modelRouteTest2 || []).find(item => item.id === req.params.id)
        if (!item) return res.status(404).json({ error: 'modelRouteTest2 not found' })
        res.json(item)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })
  

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
  })
})
#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { Command } from 'commander'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import kleur from 'kleur'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const program = new Command()


// route templates
const templates = {
  get: (resource, param) => `
app.get('/${resource}${param ? `/:${param}` : ''}', async (req, res) => {
  try {
      const data = await readData()
      ${param 
          ? `const item = (data.${resource} || []).find(item => item.${param} === req.params.${param})
      if (!item) return res.status(404).json({ error: '${resource} not found' })
      res.json(item)`
          : `res.json(data.${resource} || [])`}
  } catch (error) {
      res.status(500).json({ error: error.message })
  }
})`,
  post: (resource) => `
app.post('/${resource}', async (req, res) => {
  try {
      const data = await readData()
      if (!data.${resource}) data.${resource} = []
      const newItem = { ...req.body, id: Date.now().toString() }
      data.${resource}.push(newItem)
      await writeData(data)
      res.status(201).json(newItem)
  } catch (error) {
      res.status(500).json({ error: error.message })
  }
})`,
  put: (resource, param) => `
app.put('/${resource}/:${param}', async (req, res) => {
  try {
      const data = await readData()
      if (!data.${resource}) return res.status(404).json({ error: 'Resource not found' })
      const index = data.${resource}.findIndex(item => item.${param} === req.params.${param})
      if (index === -1) return res.status(404).json({ error: 'Item not found' })
      data.${resource}[index] = { ...req.body, ${param}: req.params.${param} }
      await writeData(data)
      res.json(data.${resource}[index])
  } catch (error) {
      res.status(500).json({ error: error.message })
  }
})`,
  delete: (resource, param) => `
app.delete('/${resource}/:${param}', async (req, res) => {
  try {
      const data = await readData()
      if (!data.${resource}) return res.status(404).json({ error: 'Resource not found' })
      data.${resource} = data.${resource}.filter(item => item.${param} !== req.params.${param})
      await writeData(data)
      res.status(204).send()
  } catch (error) {
      res.status(500).json({ error: error.message })
  }
})`
}

async function generateRoute(resource, param, method) {
  try {
      // validate inputs
      if (!resource || !method) {
          throw new Error('resource and method are required')
      }
      
      method = method.toLowerCase()
      if (!['get', 'post', 'put', 'delete'].includes(method)) {
          throw new Error('invalid HTTP method')
      }

      // backup server
      const serverPath = path.join(__dirname, 'server.js')
      const backupPath = path.join(__dirname, 'server.backup.js')
      await fs.copyFile(serverPath, backupPath)

      // read curr server
      let serverContent = await fs.readFile(serverPath, 'utf8')

      // new route create
      const newRoute = templates[method](resource, param)

      // append new route before listening tcp connec. on port
      serverContent = serverContent.replace(
          'app.listen(',
          `${newRoute}\n\napp.listen(`
      )

      // write updated routes
      await fs.writeFile(serverPath, serverContent)

      console.log(kleur.green().bold(`✓ generated ${method.toUpperCase()} /${resource}${param ? `/:${param}` : ''}`))
  } catch (error) {
      console.error(kleur.red().bold('error:', error.message))
      // restore if_backup?
      try {
          const backupPath = path.join(__dirname, 'server.backup.js')
          await fs.copyFile(backupPath, path.join(__dirname, 'server.js'))
      } catch (e) {
          console.error(kleur.red().bold('backup restoration failed'))
      }
  }
}

program
    .argument('<resource>', 'resource name (e.g., books)')
    .argument('[param]', 'parameter name (e.g., id)')
    .argument('<method>', 'HTTP method (get/post/put/delete)')
    .action(generateRoute)

program.parse(process.argv)

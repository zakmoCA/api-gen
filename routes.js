import { Router } from 'express'
import { readData } from './data-operations.js'

const router = Router()


// hardcode initial route
router.get('/books', async (req, res) => {
  try {
    const data = await readData()
    res.json(data.books || [])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// get book by id
router.get('/books/:id', async (req, res) => {
  try {
    const data = await readData()
    const book = (data.books || []).find(b => b.id === req.params.id)
    if (!book) return res.status(404).json({ error: 'Book not found' })
    res.json(book)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
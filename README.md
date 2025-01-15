# API Route Generator

CLI tool for generating RESTful API routes boilerplate for Node/Express projects.

## Generate Routes
Generate a GET route for a specific resource by ID:
```bash
./generate_routes.js authors id get
```
Terminal output:
```
✓ Generated GET /authors/:id
  → Updated ./routes.js
  → Updated ./server.js
  → Server backed up at ./server.backup.js
```


Example generated route:
```js
// GET /authors/:id
app.get('/authors/:id', async (req, res) => {
  try {
    const data = await readData();
    const item = (data.authors || []).find(item => item.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'authors not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```


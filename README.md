# API Route Generator

## About
A CLI tool for generating RESTful API routes with automatic schema management and route documentation.

## Progress 

### Currently Available Commands

- Generate GET by id route: `./generate_routes.js <resource> id get`
- Generate POST by id route: `./generate_routes.js <resource> id post`
- Generate PUT by id route: `./generate_routes.js <resource> id put`
- Generate DELETE by id route: `./generate_routes.js <resource> id delete`


### Completed Tasks

- ✓ Generate CRUD routes for any resource GET, POST, PUT, DELETE methods
- ✓ Automatic schema generation and validation



## Dependencies
- `express` - Web framework for Node.js
- `commander` - CLI argument parsing
- `kleur` - Terminal coloring

## Setup Guide
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make the route generator executable:
   ```bash
   chmod +x generate_routes.js
   ```

## Usage

### Start the Server
```bash
node server.js
```
Successful terminal output:
```
server running on port 3000
```

### Generate Routes
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

Both `routes.js` and `server.js` are updated upon generation, along with a `server.js` backup file creation.

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

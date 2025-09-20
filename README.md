# 📘 api-gen

My simple Node/Express boilerplate generator for quickly spinning up RESTful CRUD resources backed by a file-based JSON datastore.

This is mostly a personal tool — to save me wiring the same boilerplate over and over — but it’s flexible enough to actually scaffold out a whole project, define schemas, add/remove instances, and nuke resources if they’re no longer needed.

Among dependencies im using for this project are [commander](https://github.com/tj/commander.js) for simple cli-parsing, and [kleur](https://github.com/lukeed/kleur) so cli-output has some visual salience for acuity ( via `success` ticks, warnings, errors and so on). When you opt into the sample server option on resource-gen, it uses [express.js](https://github.com/expressjs/express) for my usually thin pretty basic HTTP layer functionality that its framework provides, and [fast-glob](https://github.com/mrmlnc/fast-glob) to auto-mount anything under src/routes—with no manual imports as desired.

Under the hood: mostly just Node built-ins (fs/promises, path, url, and crypto.randomUUID()), so it stays light and functional for my needs, also have gone with everything being ESM by default. If you pass --init-server, which i just added in this commit, the generator patches users target apps package.json to mean adds a start script and minimal deps, so that user can npm start immediately with no manual edits. The sample server pulls in express, uses fast-glob for auto-mounting anything in src/routes at runtime.


---

## 🔧 Usage

```bash
./generate_resource.js <resourceName> [options]   # scaffold resource (models/schema/controllers/routes)
./generate_resource.js new <resourceName> [field:value...]   # create an instance
./destroy_resource.js <resourceName>              # delete a whole resource (file/schema/store)
./destroy_resource.js instance <resourceName> <id|name>   # delete a specific instance
```

---

## 🎛 CLI Options (generate_resource)

* `--fields <fields...>`  
  Define resource fields in `key:type` format. Defaults to `id:string` and `name:string`.

  ```bash
  ./generate_resource.js book --fields "title:string" "author:string" "pages:number"
  ```

* `--only <part>`  
  Only generate one part of the resource (`model`, `controller`, `route`).

  ```bash
  ./generate_resource.js book --only model
  ```

* `--method <method>`  
  Generate only a specific HTTP method in the controller/route (`get`, `post`, `put`, `delete`).  
  (Right now the routes always scaffold full CRUD, but this is here for finer control later.)

* `--force`  
  If schema already exists, merge new fields into it.

  ```bash
  ./generate_resource.js book --fields "isbn:string" --force
  ```

* `--reset`  
  Overwrite/replace the schema entirely for a resource.

  ```bash
  ./generate_resource.js book --fields "title:string" "year:number" --reset
  ```

---

## 🪄 Resource Scaffolding

When you run:

```bash
./generate_resource.js publisher --fields "name:string" "country:string"
```

it will:

1. Generate `src/models/publisher.js` with schema + instance factory.
2. Generate `src/controllers/publishersController.js` with full CRUD handlers.
3. Generate `src/routes/publishers.js` with REST routes:
   - `GET /publishers`
   - `GET /publishers/:id`
   - `POST /publishers`
   - `PUT /publishers/:id`
   - `DELETE /publishers/:id`
4. Update `src/data/data_schema.json` with your fields.
5. Backup the previous schema to `src/backups/schemaBackup.json` if you’re overwriting.

---

## 📦 Instance Creation

```bash
./generate_resource.js new publisher name:"Penguin" country:"UK"
```

This will:

- Look up the schema for `publishers` in `data_schema.json`.
- Auto-assign a UUID for `id`.
- Fill in provided fields (`name`, `country`).
- Add the new instance into `src/data/data_store.json`.

You’ll see output like:

```
✓ Created instance in publishers: 43f3a0a0-9f5e-4b4a-8d77-2c1f048a3f5b
```

---

## 💣 Resource Destruction (destroy_resource)

```bash
./destroy_resource.js book
```

Removes:

- `src/models/book.js`
- `src/controllers/booksController.js`
- `src/routes/books.js`
- The `books` entry from `data_schema.json`
- All `books` data from `data_store.json`

```bash
./destroy_resource.js instance book 43f3a0a0-9f5e-4b4a-8d77-2c1f048a3f5b
```

Removes just the matching instance by ID (or by name if you pass a string).

```bash
./destroy_resource.js instance book "Penguin"
```

---

## ⚙️ Server

The Express server is under `src/server.js`, and covers the following:

- auto-loads all route files from `src/routes/` (no manual wiring).
- mounts them as `/<routeName>` paths.
- make sure `data_store.json` exists/valid on startup
- Listens on `http://localhost:3000` (further configurable via `PORT` val hardcoding for now but may add it to scope).

Below is som mock output you can expect to see when its fired up the server:

```
✅ Created missing data_store.json
✓ Registered route: /publishers
🚀 Server listening on http://localhost:3000
```

---

## 🛠 Data Service

`src/services/dataService.js` wraps the JSON store with CRUD helpers:

- `getAll(resource)`
- `getById(resource, id)`
- `create(resource, item)`
- `update(resource, id, newData)`
- `remove(resource, id)`

These are what the generated controllers call under the hood to illustrate.

---

## 🧨 Controller Actions

### Generate a new `author` resource
```bash
./generate_resource.js author --fields "name:string" "dob:string" "nationality:string"
```

### Add an `author` instance
```bash
./generate_resource.js new author name:"Tom Hardy" nationality:"British" dob:"1977-09-15"
```

### Delete an `author` instance
```bash
./destroy_resource.js instance author "Tom Hardy"
```

### Nuke the whole resource
```bash
./destroy_resource.js author
```

---

## Potential ideas for roadmap

Current ideas about what could be useful for workflow:

- `--with-tests` → scaffold Jest + Supertest boilerplate ?
- `--with-auth` → stub auth middleware + user model, would be keen to build this
- `--db=postgres|mongo` → generate Sequelize/Mongoose models instead of JSON  

Currently trying to quickly prototype/validate ideas with most of my workflow, definitely db/auth boilerplate and maybe tests are current thoughts, but first and foremost just package it and get it running for use with current functionality


# 📘 API Gen 

My simple script for generating RESTful API resources and boilerplate for Node/Express projects using a file-based JSON datastore. It generates the following for a given `<resource>`:

- 📄 **Model** — in ``/src/models/``
- 🧠 **Controller** — in ``/src/controllers/``
- 🔁 **Route** — resource routes auto-injected in resource routes route auto-registere in/exported from `/src/routes/` + pulled into `/src/server.js`
- 📚 **Schema entry** — in ``/src/data/data_schema.json``
- 🧬 **Instance (optional)** — in ``/src/data/data_store.json`` when using the `new` keyword


## 🔧 Usage

```bash
./generate_resource.js <resourceName> [options] # resource models/schema/routes/controllers creation
./generate_resource.js new <resourceName> [field:value...] # resource instance creation
```

The command: 

```bash
./generate_resource.js author --fields id:string name:string
```

Creates the following.

*   `/src/models/author.js`
    
*   `/src/controllers/authorsController.js`
    
*   `/src/routes/authors.js`
    
*   Adds `"authors"` to `/src/data/data_schema.json` in the form:

```json
{
  "authors": {
    "id": "string",
    "name": "string"
  }
}
```
    
*   Route will respond at `http://localhost:3000/authors`


...and so does simply inputting `<resourceName>` as your only arg.

```bash
./generate_resource.js author
```

This simpler commandline input above does the exact same thing that is gnerating unique-id creation logic + name:string for [field:value] by default in absence of `[options]` args.

### 📦 Generating a Resource

Current `API Gen` functionality includes generation of standard REST API boilerplate and setup for a given resource via commandline args, which includes the following for a given `<resource>` in script execution :

- Model in `/src/models/`
- Controller in `/src/controllers/`
- Route in `/src/routes/`
- Schema entry in `/src/data/data_schema.json`
- A new resource instance in `/src/data/data_store.json` via the `new` keyword followed by `[options]` args.
-  `/src/backups/schemaBACKUP.js` upon a resource models JSON schema file update (poor mans migration) via the `[options]` flag `--force`
- Parsed and auto-formatted output under the lexically correct singular/plural form of `commandline-args/model/filesNames/routes/HTTP-methods` naming as per convention



#### 🧬 Create Resource/Resource Instance


Resource/unique resource instance creation inside `/src/data/data_store.json` via HTTP requests to server via CURL/api-testing tools functionality ie. `Postman` 
  - This can be via the `new` keyword followed by `[options]` args ie. `./generate_resource.js new author name:"J. R. R. Tolkein"`. 
    - This will generate:
      - A new instance inside `/src/data/data_store.json` for the `authors` collection         
      - Auto-generates a unique `id` for this instance

Consider the above examples code execution given the following series of commands:

```bash
  # 1. Default resource generation using only <resourceName> arg
  ./generate_resource.js authors # creates and outputs the following to std:out ⬇️
  # ✓ Created: api-gen/src/models/author.js
  # ✓ Updated schema for: authors
  # ✓ Created: api-gen/src/controllers/authorsController.js
  # ✓ Created: /api-gen/src/routes/authors.js

  # 2. author instance creation while updating the value name 
  # name:string is the only default [field:value] attributes populated for a resource schema upon resource creation with ./exe <resourceName> cml-input with no [options] flags
  ./generate_resource.js new author name:"George R R Tolkein" # Created instance in authors: dc3843cb-d477-4776-a861-fc34104145e6

  # 3. Generate new `author` resource instance 
  ./generate_resource.js new author name:"J. R. R. Tolkein" # ✓ Created instance in authors: 536d36ed-f561-4cf7-9c46-1b1d294aefae

      # creates inside authors schema:

        # src/data/data_store.json
        {
          "authors": [
            {
              "id": "536d36ed-f561-4cf7-9c46-1b1d294aefae",
              "name": "J. R. R. Tolkein"
            }
          ]
        }

  # 4. get specific author via /authors/:id using id from instanceObj at src/data/data_store.json
  curl http://localhost:3000/authors/536d36ed-f561-4cf7-9c46-1b1d294aefae # {"id":"536d36ed-f561-4cf7-9c46-1b1d294aefae","name":"J. R. R. Tolkein"}%   
```

### Resource Testing & Design Using Curl/API-tools
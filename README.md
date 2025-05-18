
# 📘 api-gen

My simple script for generating RESTful API resources and boilerplate for Node/Express projects using a file-based JSON datastore.

## 🔧 Usage

```bash
./generate_resource.js <resourceName> [options] # resource models/schema/routes/controllers creation
./generate_resource.js new <resourceName> [field:value...] # resource instance creation
```

### 🎛 CLI Options

*   `--fields`: Define resource fields as `key:type`
    
*   `--only`: Restrict generation to a specific part (`model`, `controller`, `route`)
    
*   `--method`: Limit route/controller to specific method (`get`, `post`, `put`, `delete`)
    
*   `--force`: Merge new fields into an existing schema
    
*   `--reset`: Replace entire schema for a resource
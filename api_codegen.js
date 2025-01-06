 fs = require('fs/promises')
 path = require('path')

async function generateRoute(model, param, method) {
     routeTemplate = `
app.${method.toLowerCase()}('/${model}/${param ? `:${param}` : ''}', async (req, res) => {
    try {
         data = await readData()
        // Add your route logic here
        res.json({ message: '${method} ${model} endpoint' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})
`;
    
    // append2file
    await fs.appendFile('routes.js', routeTemplate)
}

// cli invocation
 [model, param, method] = process.argv.slice(2)
generateRoute(model, param, method).catch(console.error)
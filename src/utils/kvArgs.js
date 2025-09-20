// this will take an arr input and process/transform it appropriately for receiving by the api-gen codebase modules for code-gen
// an example below demonstrating it like so ⬇️:
// ---------(fnsinput)---------> ["name:\"Worcestershire\"", "country:\"UK\""] into { name: "Worcestershire", country: "UK" }
export function parseKvArgs(pairs = []) {
  const out = {}
  for (const raw of pairs) {
    // split only on the first colon to allow values that include colons
    const idx = raw.indexOf(':')
    if (idx === -1) continue
    const key = raw.slice(0, idx).trim()
    let val = raw.slice(idx + 1).trim()

    // strip matching single or double quotes if present
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    // basic type inference for posterity
    if (val === 'true') out[key] = true
    else if (val === 'false') out[key] = false
    else if (!Number.isNaN(Number(val)) && val !== '') out[key] = Number(val)
    else out[key] = val
  }
  return out
}

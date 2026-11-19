import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const manifest = JSON.parse(await readFile(new URL("./public/manus-routes.json", import.meta.url)))
assert.ok(Array.isArray(manifest.routes))
assert.ok(manifest.routes.length > 0)
assert.ok(manifest.routes.every((route) => route.path.startsWith("/")))

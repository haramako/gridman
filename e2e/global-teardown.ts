import { rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dest = resolve(root, 'var', 'e2e-test')

export default function globalTeardown() {
  rmSync(dest, { recursive: true, force: true })
}

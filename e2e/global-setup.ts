import { execSync } from 'node:child_process'

export default function globalSetup() {
  execSync('npm run e2e:reset', { stdio: 'inherit' })
}

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const firebase = fileURLToPath(new URL('../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const children = new Set()
let stopping = false

function start(script, args, env = {}) {
  const child = spawn(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })
  children.add(child)
  child.once('exit', (code, signal) => {
    children.delete(child)
    if (!stopping) stop(code ?? (signal ? 1 : 0))
  })
}
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => process.exit(code), 250).unref()
}

process.once('SIGINT', () => stop(0))
process.once('SIGTERM', () => stop(0))
start(firebase, ['emulators:start', '--only', 'auth,firestore,functions', '--project', 'demo-moviedna'], { FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' })
start(vite, ['--mode', 'emulator'], { VITE_MOVIEDNA_LOCAL: 'true' })

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const firebase = fileURLToPath(new URL('../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const emulatorData = fileURLToPath(new URL('../.firebase-emulator-data/', import.meta.url))
const emulatorMetadata = fileURLToPath(
  new URL('../.firebase-emulator-data/firebase-export-metadata.json', import.meta.url),
)

const children = new Set()
let stopping = false
let requestedExitCode = 0
let forceExitTimer = null

function start(script, args, env = {}) {
  const child = spawn(
    process.execPath,
    [script, ...args],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    },
  )

  children.add(child)

  child.once('exit', (code, signal) => {
    children.delete(child)

    const childExitCode = code ?? (signal ? 1 : 0)

    if (!stopping) {
      stop(childExitCode)
      return
    }

    if (children.size === 0) {
      if (forceExitTimer) clearTimeout(forceExitTimer)
      process.exit(requestedExitCode)
    }
  })
}

function stop(code = 0) {
  if (stopping) return

  stopping = true
  requestedExitCode = code

  for (const child of children) {
    child.kill('SIGTERM')
  }

  if (children.size === 0) {
    process.exit(requestedExitCode)
  }

  forceExitTimer = setTimeout(() => {
    for (const child of children) {
      child.kill('SIGKILL')
    }

    process.exit(requestedExitCode)
  }, 10_000)

  forceExitTimer.unref()
}

process.once('SIGINT', () => stop(0))
process.once('SIGTERM', () => stop(0))

const firebaseArgs = [
  'emulators:start',
  '--only',
  'auth,firestore,functions',
  '--project',
  'demo-moviedna',
  `--export-on-exit=${emulatorData}`,
]

if (existsSync(emulatorMetadata)) {
  firebaseArgs.push(`--import=${emulatorData}`)
}

start(
  firebase,
  firebaseArgs,
  { FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' },
)

start(
  vite,
  ['--mode', 'emulator'],
  { VITE_MOVIEDNA_LOCAL: 'true' },
)

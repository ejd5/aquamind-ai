#!/usr/bin/env node

import { access, mkdir, rename, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apiDirectory = join(root, 'src', 'app', 'api')
const stashRoot = join(root, '.mobile-build-stash')
const stashedApiDirectory = join(stashRoot, 'api')

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function recoverInterruptedBuild() {
  const apiExists = await pathExists(apiDirectory)
  const stashExists = await pathExists(stashedApiDirectory)

  if (!apiExists && stashExists) {
    await mkdir(dirname(apiDirectory), { recursive: true })
    await rename(stashedApiDirectory, apiDirectory)
  }

  await rm(stashRoot, { recursive: true, force: true })
}

async function runNextBuild() {
  return await new Promise((resolve, reject) => {
    const child = spawn('bun', ['x', 'next', 'build'], {
      cwd: root,
      env: {
        ...process.env,
        MOBILE_BUILD: 'true',
      },
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Mobile build terminated by ${signal}`))
        return
      }
      resolve(code ?? 1)
    })
  })
}

let apiStashed = false
let exitCode = 1

try {
  await recoverInterruptedBuild()

  if (await pathExists(apiDirectory)) {
    await mkdir(stashRoot, { recursive: true })
    await rename(apiDirectory, stashedApiDirectory)
    apiStashed = true
  }

  exitCode = await runNextBuild()
} catch (error) {
  console.error('[mobile-build] failed:', error)
  exitCode = 1
} finally {
  if (apiStashed && (await pathExists(stashedApiDirectory))) {
    await mkdir(dirname(apiDirectory), { recursive: true })
    await rename(stashedApiDirectory, apiDirectory)
  }
  await rm(stashRoot, { recursive: true, force: true })
}

process.exit(exitCode)

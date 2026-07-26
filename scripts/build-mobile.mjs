#!/usr/bin/env node

import { access, cp, mkdir, rename, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const appDirectory = join(root, 'src', 'app')
const mobileAppSource = join(root, 'src', 'mobile-app')
const middlewarePath = join(root, 'src', 'middleware.ts')
const stashRoot = join(root, '.mobile-build-stash')
const stashedAppDirectory = join(stashRoot, 'app')
const stashedMiddlewarePath = join(stashRoot, 'middleware.ts')
const stashedGlobals = join(stashedAppDirectory, 'globals.css')
const generatedGlobals = join(appDirectory, 'globals.css')

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function restoreStash() {
  if (await pathExists(stashedAppDirectory)) {
    await rm(appDirectory, { recursive: true, force: true })
    await mkdir(dirname(appDirectory), { recursive: true })
    await rename(stashedAppDirectory, appDirectory)
  }

  if (await pathExists(stashedMiddlewarePath)) {
    await rm(middlewarePath, { force: true })
    await rename(stashedMiddlewarePath, middlewarePath)
  }

  await rm(stashRoot, { recursive: true, force: true })
}

async function recoverInterruptedBuild() {
  if (
    (await pathExists(stashedAppDirectory)) ||
    (await pathExists(stashedMiddlewarePath))
  ) {
    await restoreStash()
  } else {
    await rm(stashRoot, { recursive: true, force: true })
  }
}

async function prepareMobileApp() {
  if (!(await pathExists(mobileAppSource))) {
    throw new Error('Missing src/mobile-app source tree')
  }

  await mkdir(stashRoot, { recursive: true })
  await rename(appDirectory, stashedAppDirectory)

  if (await pathExists(middlewarePath)) {
    await rename(middlewarePath, stashedMiddlewarePath)
  }

  await cp(mobileAppSource, appDirectory, { recursive: true })

  if (await pathExists(stashedGlobals)) {
    await cp(stashedGlobals, generatedGlobals)
  }
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

let exitCode = 1

try {
  await recoverInterruptedBuild()
  await prepareMobileApp()
  exitCode = await runNextBuild()
} catch (error) {
  console.error('[mobile-build] failed:', error)
  exitCode = 1
} finally {
  await restoreStash()
}

process.exit(exitCode)

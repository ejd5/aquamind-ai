import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const previewUrl = process.env.PREVIEW_URL
const outputDir = process.env.QA_OUTPUT_DIR || 'artifacts/visual-qa'

if (!previewUrl) {
  throw new Error('PREVIEW_URL is required')
}

await mkdir(outputDir, { recursive: true })

async function waitForPreview(url, timeoutMs = 8 * 60 * 1000) {
  const started = Date.now()
  let lastStatus = null
  let lastError = null

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'follow' })
      lastStatus = response.status
      if (response.status >= 200 && response.status < 400) return
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    await new Promise((resolve) => setTimeout(resolve, 15_000))
  }

  throw new Error(
    `Preview did not become ready in time (status=${lastStatus}, error=${lastError})`
  )
}

const cases = [
  {
    name: 'landing-desktop',
    path: '/',
    viewport: { width: 1440, height: 1000 },
    sections: ['#top', '#solution', '#fonctionnalites', '#final-cta'],
  },
  {
    name: 'landing-tablet',
    path: '/',
    viewport: { width: 768, height: 1024 },
    sections: ['#top', '#solution', '#fonctionnalites', '#final-cta'],
  },
  {
    name: 'landing-mobile',
    path: '/',
    viewport: { width: 390, height: 844 },
    sections: ['#top', '#solution', '#fonctionnalites', '#final-cta'],
  },
  {
    name: 'signin-mobile',
    path: '/auth/signin',
    viewport: { width: 390, height: 844 },
    sections: [],
  },
  {
    name: 'pro-auth-redirect',
    path: '/pro/app',
    viewport: { width: 1440, height: 1000 },
    sections: [],
  },
]

await waitForPreview(previewUrl)

const browser = await chromium.launch({ headless: true })
const results = []

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto(new URL(testCase.path, previewUrl).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  })

  await page.waitForTimeout(4_000)

  const metrics = await page.evaluate(() => {
    const images = [...document.images]
    const targets = [...document.querySelectorAll('a, button, input, select, textarea, [role="button"]')]
      .filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          label:
            element.getAttribute('aria-label') ||
            element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ||
            '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })

    const headings = [...document.querySelectorAll('h1, h2, h3')]
      .slice(0, 30)
      .map((heading) => ({
        tag: heading.tagName.toLowerCase(),
        text: heading.textContent?.trim().replace(/\s+/g, ' ').slice(0, 160) || '',
        fontFamily: getComputedStyle(heading).fontFamily,
      }))

    return {
      title: document.title,
      finalUrl: location.href,
      bodyTextLength: document.body.innerText.trim().length,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      imageCount: images.length,
      brokenImages: images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      targetCount: targets.length,
      smallTargets: targets.filter((target) => target.width < 44 || target.height < 44).slice(0, 40),
      headings,
      h1FontFamily: document.querySelector('h1')
        ? getComputedStyle(document.querySelector('h1')).fontFamily
        : null,
    }
  })

  await page.screenshot({
    path: `${outputDir}/${testCase.name}-full.png`,
    fullPage: true,
  })

  for (const selector of testCase.sections) {
    const section = page.locator(selector).first()
    if (await section.count()) {
      const visible = await section.isVisible().catch(() => false)
      if (visible) {
        const safeName = selector.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
        await section.screenshot({ path: `${outputDir}/${testCase.name}-${safeName}.png` })
      }
    }
  }

  results.push({
    name: testCase.name,
    requestedUrl: new URL(testCase.path, previewUrl).toString(),
    status: response?.status() ?? null,
    ...metrics,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 30),
    pageErrors: [...new Set(pageErrors)].slice(0, 30),
  })

  await context.close()
}

await browser.close()

const hardFailures = results.flatMap((result) => {
  const failures = []
  if (!result.status || result.status >= 400) failures.push(`${result.name}: HTTP ${result.status}`)
  if (result.horizontalOverflow > 2) {
    failures.push(`${result.name}: horizontal overflow ${result.horizontalOverflow}px`)
  }
  if (result.brokenImages.length > 0) {
    failures.push(`${result.name}: ${result.brokenImages.length} broken image(s)`)
  }
  if (result.bodyTextLength < 50) failures.push(`${result.name}: suspiciously empty page`)
  return failures
})

const report = {
  generatedAt: new Date().toISOString(),
  previewUrl,
  hardFailures,
  results,
}

await writeFile(`${outputDir}/qa-report.json`, JSON.stringify(report, null, 2))

const summary = [
  '# AQWELIA Preview Visual QA',
  '',
  `Preview: ${previewUrl}`,
  `Generated: ${report.generatedAt}`,
  `Hard failures: ${hardFailures.length}`,
  '',
  ...results.flatMap((result) => [
    `## ${result.name}`,
    `- HTTP: ${result.status}`,
    `- Final URL: ${result.finalUrl}`,
    `- Horizontal overflow: ${result.horizontalOverflow}px`,
    `- Images: ${result.imageCount}, broken: ${result.brokenImages.length}`,
    `- Interactive targets: ${result.targetCount}, under 44 px: ${result.smallTargets.length}`,
    `- Console errors: ${result.consoleErrors.length}`,
    `- Page errors: ${result.pageErrors.length}`,
    '',
  ]),
]

await writeFile(`${outputDir}/summary.md`, summary.join('\n'))

console.log(summary.join('\n'))

if (hardFailures.length > 0) {
  console.error('\nHard failures:')
  for (const failure of hardFailures) console.error(`- ${failure}`)
  process.exitCode = 1
}

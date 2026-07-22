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
    const isVisible = (element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      )
    }

    const compactText = (value, limit = 120) =>
      (value || '').trim().replace(/\s+/g, ' ').slice(0, limit)

    const getAccessibleName = (element) => {
      const ariaLabel = element.getAttribute('aria-label')
      if (ariaLabel?.trim()) return compactText(ariaLabel)

      const labelledBy = element.getAttribute('aria-labelledby')
      if (labelledBy) {
        const labelledText = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || '')
          .join(' ')
        if (labelledText.trim()) return compactText(labelledText)
      }

      if (element instanceof HTMLImageElement && element.alt.trim()) {
        return compactText(element.alt)
      }

      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        if (element.id) {
          const explicitLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
          if (explicitLabel?.textContent?.trim()) return compactText(explicitLabel.textContent)
        }
        const wrappingLabel = element.closest('label')
        if (wrappingLabel?.textContent?.trim()) return compactText(wrappingLabel.textContent)
      }

      const text = compactText(element.textContent)
      if (text) return text

      const title = element.getAttribute('title')
      if (title?.trim()) return compactText(title)

      return ''
    }

    const images = [...document.images]
    const interactiveElements = [
      ...document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
      ),
    ].filter(isVisible)

    const targets = interactiveElements.map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        tag: element.tagName.toLowerCase(),
        label: getAccessibleName(element),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    })

    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .filter(isVisible)
      .slice(0, 60)
      .map((heading) => ({
        tag: heading.tagName.toLowerCase(),
        level: Number(heading.tagName.slice(1)),
        text: compactText(heading.textContent, 160),
        fontFamily: getComputedStyle(heading).fontFamily,
      }))

    const headingLevelJumps = headings
      .map((heading, index) => ({ previous: headings[index - 1], current: heading }))
      .filter(({ previous, current }) => previous && current.level > previous.level + 1)
      .map(({ previous, current }) => `${previous.tag} → ${current.tag}: ${current.text}`)

    const formControlsWithoutLabel = [
      ...document.querySelectorAll(
        'input:not([type="hidden"]), select, textarea'
      ),
    ]
      .filter(isVisible)
      .filter((element) => !getAccessibleName(element))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type'),
        id: element.id || null,
        name: element.getAttribute('name'),
      }))

    const ids = [...document.querySelectorAll('[id]')]
      .map((element) => element.id)
      .filter(Boolean)
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]

    return {
      title: document.title,
      finalUrl: location.href,
      documentLang: document.documentElement.lang,
      bodyTextLength: document.body.innerText.trim().length,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      imageCount: images.length,
      brokenImages: images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      imagesMissingAlt: images
        .filter((image) => !image.hasAttribute('alt'))
        .map((image) => image.currentSrc || image.src),
      targetCount: targets.length,
      smallTargets: targets.filter((target) => target.width < 44 || target.height < 44).slice(0, 40),
      unnamedInteractive: targets.filter((target) => !target.label).slice(0, 40),
      formControlsWithoutLabel,
      duplicateIds,
      headings,
      h1Count: headings.filter((heading) => heading.tag === 'h1').length,
      headingLevelJumps,
      h1FontFamily: document.querySelector('h1')
        ? getComputedStyle(document.querySelector('h1')).fontFamily
        : null,
    }
  })

  const keyboardFocus = []
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) return null
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        tag: element.tagName.toLowerCase(),
        label:
          element.getAttribute('aria-label') ||
          element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ||
          element.getAttribute('name') ||
          '',
        visible: rect.width > 0 && rect.height > 0,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      }
    })
    if (focused) keyboardFocus.push(focused)
  }

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
    keyboardFocus,
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
  if (!result.documentLang) failures.push(`${result.name}: missing document language`)
  if (result.imagesMissingAlt.length > 0) {
    failures.push(`${result.name}: ${result.imagesMissingAlt.length} image(s) missing alt attribute`)
  }
  if (result.unnamedInteractive.length > 0) {
    failures.push(`${result.name}: ${result.unnamedInteractive.length} unnamed interactive control(s)`)
  }
  if (result.formControlsWithoutLabel.length > 0) {
    failures.push(`${result.name}: ${result.formControlsWithoutLabel.length} form control(s) without label`)
  }
  if (result.duplicateIds.length > 0) {
    failures.push(`${result.name}: duplicate id(s): ${result.duplicateIds.join(', ')}`)
  }
  if (result.h1Count !== 1) failures.push(`${result.name}: expected 1 h1, found ${result.h1Count}`)
  if (result.headingLevelJumps.length > 0) {
    failures.push(`${result.name}: ${result.headingLevelJumps.length} heading level jump(s)`)
  }
  if (result.targetCount > 0 && result.keyboardFocus.length === 0) {
    failures.push(`${result.name}: keyboard navigation did not reach an interactive control`)
  }
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
  '# AQWELIA Preview Visual & Accessibility QA',
  '',
  `Preview: ${previewUrl}`,
  `Generated: ${report.generatedAt}`,
  `Hard failures: ${hardFailures.length}`,
  '',
  ...results.flatMap((result) => [
    `## ${result.name}`,
    `- HTTP: ${result.status}`,
    `- Final URL: ${result.finalUrl}`,
    `- Document language: ${result.documentLang || 'missing'}`,
    `- H1 count: ${result.h1Count}`,
    `- Heading level jumps: ${result.headingLevelJumps.length}`,
    `- Horizontal overflow: ${result.horizontalOverflow}px`,
    `- Images: ${result.imageCount}, broken: ${result.brokenImages.length}, missing alt: ${result.imagesMissingAlt.length}`,
    `- Interactive targets: ${result.targetCount}, under 44 px: ${result.smallTargets.length}, unnamed: ${result.unnamedInteractive.length}`,
    `- Form controls without label: ${result.formControlsWithoutLabel.length}`,
    `- Duplicate IDs: ${result.duplicateIds.length}`,
    `- Keyboard focus samples: ${result.keyboardFocus.length}`,
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

import { mkdir, writeFile } from 'node:fs/promises'

const previewUrl = process.env.PREVIEW_URL
const outputDir = process.env.QA_OUTPUT_DIR || 'artifacts/visual-qa'

if (!previewUrl) throw new Error('PREVIEW_URL is required')

await mkdir(outputDir, { recursive: true })

const probes = [
  '/api/preview-health',
  '/api/auth/session',
  '/api/auth/providers',
  '/pro/app',
]

const results = []

for (const path of probes) {
  const url = new URL(path, previewUrl).toString()

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { Accept: 'application/json,text/html;q=0.9,*/*;q=0.8' },
    })
    const body = (await response.text()).slice(0, 4000)

    results.push({
      path,
      url,
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type'),
      body,
    })
  } catch (error) {
    results.push({
      path,
      url,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

await writeFile(
  `${outputDir}/runtime-probes.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), previewUrl, results }, null, 2)
)

const markdown = [
  '# AQWELIA Preview Runtime Probes',
  '',
  `Preview: ${previewUrl}`,
  '',
  ...results.flatMap((result) => [
    `## ${result.path}`,
    `- Status: ${result.status}`,
    `- Location: ${result.location ?? '—'}`,
    `- Content-Type: ${result.contentType ?? '—'}`,
    '',
    '```text',
    result.body || result.error || '',
    '```',
    '',
  ]),
]

await writeFile(`${outputDir}/runtime-probes.md`, markdown.join('\n'))
console.log(markdown.join('\n'))

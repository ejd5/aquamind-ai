from pathlib import Path

old = r'''function toSafePhotoReferences(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const safe = value.slice(0, 20).flatMap((item) => {
    if (typeof item === 'string' && /^(https:\/\/|redacted:\/\/)/.test(item)) {
      return [item.slice(0, 2_000)]
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (/^(https:\/\/|redacted:\/\/)/.test(url)) {
        return [{
          url: url.slice(0, 2_000),
          capturedAt: typeof record.capturedAt === 'string' ? record.capturedAt.slice(0, 80) : undefined,
          label: typeof record.label === 'string' ? record.label.slice(0, 120) : undefined,
        }]
      }
    }
    return []
  })
  return safe.length ? JSON.stringify(safe) : null
}'''

new = r'''type SafePhotoReference = string | {
  url: string
  capturedAt?: string
  label?: string
}

function toSafePhotoReferences(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const safe: SafePhotoReference[] = []
  for (const item of value.slice(0, 20)) {
    if (typeof item === 'string' && /^(https:\/\/|redacted:\/\/)/.test(item)) {
      safe.push(item.slice(0, 2_000))
      continue
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (/^(https:\/\/|redacted:\/\/)/.test(url)) {
        safe.push({
          url: url.slice(0, 2_000),
          capturedAt: typeof record.capturedAt === 'string' ? record.capturedAt.slice(0, 80) : undefined,
          label: typeof record.label === 'string' ? record.label.slice(0, 120) : undefined,
        })
      }
    }
  }
  return safe.length ? JSON.stringify(safe) : null
}'''

for name in [
    'src/app/api/pro/interventions/route.ts',
    'src/app/api/pro/interventions/[id]/route.ts',
]:
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Safe photo helper not found in {name}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

print('Safe photo reference types fixed')

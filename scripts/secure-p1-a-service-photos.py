from __future__ import annotations

import re
from pathlib import Path

page_path = Path('src/app/pro/app/interventions/[id]/page.tsx')
page = page_path.read_text(encoding='utf-8')
page = page.replace('  Camera,\n', '')
page = page.replace('  Trash2,\n', '')
page = page.replace("type Photo = { url: string; capturedAt: string; label?: string }\n", '')
page = page.replace("  const [photos, setPhotos] = useState<Photo[]>([])\n", '')
page = page.replace("      setPhotos(parsePhotos(value.photos))\n", '')
page = page.replace("        photos,\n", '')
page = re.sub(
    r"\n  async function addPhotos\(files: FileList \| null\) \{.*?\n  \}\n\n  if \(loading\)",
    "\n\n  if (loading)",
    page,
    count=1,
    flags=re.S,
)
photo_section_start = '        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">\n          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Camera'
photo_section_end = '        </section>\n        {intervention.pool ?'
if photo_section_start not in page or photo_section_end not in page:
    raise RuntimeError('Intervention photo section markers missing')
start = page.index(photo_section_start)
end = page.index(photo_section_end, start) + len('        </section>\n')
page = page[:start] + page[end:]
page = re.sub(r"\nfunction parsePhotos\(.*?\n", "\n", page, count=1)
compress_marker = '\nasync function compressPhoto(file: File): Promise<string> {'
if compress_marker not in page:
    raise RuntimeError('compressPhoto marker missing')
page = page[:page.index(compress_marker)].rstrip() + '\n'
page_path.write_text(page, encoding='utf-8')

helper = r'''
function containsEmbeddedPhoto(value: unknown): boolean {
  try {
    return JSON.stringify(value).includes('data:image/')
  } catch {
    return true
  }
}

function toSafePhotoReferences(value: unknown): string | null {
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
}
'''

for route_name in [
    'src/app/api/pro/interventions/route.ts',
    'src/app/api/pro/interventions/[id]/route.ts',
]:
    route_path = Path(route_name)
    route = route_path.read_text(encoding='utf-8')
    marker = "\nfunction addRecurrence(" if route_name.endswith('/route.ts') and '[id]' not in route_name else "\nasync function getOwnedIntervention("
    if helper.strip() not in route:
        if marker not in route:
            raise RuntimeError(f'Helper insertion marker missing in {route_name}')
        route = route.replace(marker, '\n' + helper.strip() + '\n' + marker, 1)

    if '[id]' not in route_name:
        validation_marker = "  const scheduledAt = parseOptionalDate(body.scheduledAt)\n"
        if validation_marker not in route:
            raise RuntimeError('POST photo validation marker missing')
        route = route.replace(
            validation_marker,
            "  if (body.photos !== undefined && containsEmbeddedPhoto(body.photos)) {\n"
            "    return NextResponse.json({ error: 'Embedded service photos are not accepted' }, { status: 400 })\n"
            "  }\n\n" + validation_marker,
            1,
        )
        route = route.replace('              photos: toJsonArray(body.photos),', '              photos: toSafePhotoReferences(body.photos),', 1)
    else:
        old = "  if (body.photos !== undefined) data.photos = toJsonArray(body.photos)"
        new = (
            "  if (body.photos !== undefined) {\n"
            "    if (containsEmbeddedPhoto(body.photos)) {\n"
            "      return NextResponse.json({ error: 'Embedded service photos are not accepted' }, { status: 400 })\n"
            "    }\n"
            "    data.photos = toSafePhotoReferences(body.photos)\n"
            "  }"
        )
        if old not in route:
            raise RuntimeError('PATCH photo assignment marker missing')
        route = route.replace(old, new, 1)
    route_path.write_text(route, encoding='utf-8')

test_path = Path('tests/p1-a-pro-crm-foundation.test.ts')
test = test_path.read_text(encoding='utf-8')
insert = r'''

  it('never stores embedded service photos in the CRM database', () => {
    const createRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pro/interventions/route.ts'),
      'utf8',
    )
    const updateRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pro/interventions/[id]/route.ts'),
      'utf8',
    )
    const page = readFileSync(
      join(process.cwd(), 'src/app/pro/app/interventions/[id]/page.tsx'),
      'utf8',
    )
    expect(createRoute).toContain('containsEmbeddedPhoto')
    expect(updateRoute).toContain('toSafePhotoReferences')
    expect(createRoute).not.toContain('photos: toJsonArray(body.photos)')
    expect(page).not.toContain('canvas.toDataURL')
    expect(page).not.toContain('accept="image/*"')
  })
'''
closing = '\n})\n'
if not test.endswith(closing):
    raise RuntimeError('Test suite closing marker missing')
test = test[:-len(closing)] + insert + closing
test_path.write_text(test, encoding='utf-8')

print('P1-A service photo privacy correction applied')
# trigger

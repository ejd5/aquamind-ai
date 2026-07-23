from pathlib import Path

paths = [
    Path('src/app/pro/app/interventions/[id]/page.tsx'),
    Path('src/app/pro/app/pools/[id]/page.tsx'),
]

old = "  useEffect(() => { void load() }, [load])"
new = """  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])"""

for path in paths:
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Expected effect not found in {path}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

print('P1-A initial-load effects deferred')

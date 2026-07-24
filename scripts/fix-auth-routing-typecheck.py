from pathlib import Path

path = Path('src/lib/pro/dispatch-server.ts')
text = path.read_text(encoding='utf-8')
old = '  const mapped = members.map((member) => ({'
new = '  const mapped: DispatchMember[] = members.map((member) => ({'
if old not in text:
    raise RuntimeError('Dispatch member mapping marker not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

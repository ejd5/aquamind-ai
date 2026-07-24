from pathlib import Path

path = Path('src/app/auth/signin/page.tsx')
text = path.read_text(encoding='utf-8')
old = """  const callbackUrl =
    requestedCallbackUrl?.startsWith('/') && !requestedCallbackUrl.startsWith('//')
      ? requestedCallbackUrl
      : '/'
"""
new = """  const callbackUrl =
    requestedCallbackUrl?.startsWith('/') && !requestedCallbackUrl.startsWith('//')
      ? requestedCallbackUrl
      : '/auth/entry'
"""
if old not in text:
    raise RuntimeError('Signin callback block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

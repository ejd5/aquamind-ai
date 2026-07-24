from pathlib import Path

path = Path('src/components/pro/gps-device-settings.tsx')
source = path.read_text(encoding='utf-8')
import_marker = "import { Check, Clipboard, Loader2, RadioTower, Trash2 } from 'lucide-react'\n"
copy_import = "import { PRO_GPS_DEVICE_COPY } from '@/i18n/locales/pro-gps-device-copy'\n"
if copy_import not in source:
    if import_marker not in source:
        raise RuntimeError('Lucide import marker missing')
    source = source.replace(import_marker, import_marker + copy_import, 1)

start = source.find('const COPY = {')
end_marker = '} as const\n\n'
if start >= 0:
    end = source.find(end_marker, start)
    if end < 0:
        raise RuntimeError('Local COPY end marker missing')
    source = source[:start] + source[end + len(end_marker):]

source = source.replace('keyof typeof COPY', 'keyof typeof PRO_GPS_DEVICE_COPY')
source = source.replace('const copy = COPY[locale] ?? COPY.en', 'const copy = PRO_GPS_DEVICE_COPY[locale] ?? PRO_GPS_DEVICE_COPY.en')
path.write_text(source, encoding='utf-8')
print('GPS device copy moved to canonical locale source')

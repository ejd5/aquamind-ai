from pathlib import Path

replacements = {
    Path('src/app/api/pro/clients/route.ts'): {
        "title: 'Client créé',": "title: 'crm.client_created',",
    },
    Path('src/app/api/pro/clients/[id]/route.ts'): {
        "title: `Statut : ${existing.status} → ${data.status}`,": "title: `crm.status_change:${existing.status}:${data.status}` ,",
    },
}

for path, mapping in replacements.items():
    text = path.read_text(encoding='utf-8')
    for old, new in mapping.items():
        if old not in text:
            raise RuntimeError(f'Missing expected text in {path}: {old}')
        text = text.replace(old, new, 1)
    path.write_text(text, encoding='utf-8')

print('P1-A CRM i18n literals replaced')

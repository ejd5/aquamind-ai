from pathlib import Path

path = Path('src/app/api/pro/interventions/route.ts')
text = path.read_text(encoding='utf-8')
text = text.replace("import { Prisma } from '@prisma/client'", "import { Prisma, type ProIntervention } from '@prisma/client'", 1)
text = text.replace('      const interventions = []', '      const interventions: ProIntervention[] = []', 1)
path.write_text(text, encoding='utf-8')
print('P1-A intervention type inference fixed')

from pathlib import Path

files = [
    Path('src/app/pro/app/interventions/[id]/page.tsx'),
    Path('src/app/pro/app/pools/[id]/page.tsx'),
]

for path in files:
    text = path.read_text(encoding='utf-8')
    text = text.replace('  Download,\n', '')
    if 'interventions/[id]' in str(path):
        old = '''    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/pro/app/interventions" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t('crmBackInterventions')}</Link>
      <a href={`/api/pro/interventions/${id}/report`} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><Download className="h-4 w-4" />{t('crmDownloadReport')}</a>
    </div>'''
        new = '''    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/pro/app/interventions" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t('crmBackInterventions')}</Link>
    </div>'''
    else:
        old = '''    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/pro/app/pools" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t('crmBackPools')}</Link><a href={`/api/pro/pools/${pool.id}/report`} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><Download className="h-4 w-4" />{t('crmPoolReport')}</a></div>'''
        new = '''    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/pro/app/pools" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t('crmBackPools')}</Link></div>'''
    if old not in text:
        raise RuntimeError(f'Placeholder report action not found in {path}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

print('Unavailable P1-A report actions removed')

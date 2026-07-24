from pathlib import Path

replacements = {
    Path('src/app/api/pro/dispatch/live/route.ts'): (
        "const activeSessionById = new Map(activeSessions.map((trackingSession) => [trackingSession.id, trackingSession]))",
        "const activeSessionById = new Map(activeSessions.map((trackingSession) => [trackingSession.id, trackingSession] as const))",
    ),
    Path('src/app/api/pro/dispatch/recommend/route.ts'): (
        "const activeSessionById = new Map(activeSessions.map((trackingSession) => [trackingSession.id, trackingSession]))",
        "const activeSessionById = new Map(activeSessions.map((trackingSession) => [trackingSession.id, trackingSession] as const))",
    ),
}

for path, (old, new) in replacements.items():
    source = path.read_text(encoding='utf-8')
    if new not in source:
        if old not in source:
            raise RuntimeError(f'Map tuple marker missing in {path}')
        source = source.replace(old, new, 1)
        path.write_text(source, encoding='utf-8')

print('P1-C GPS TypeScript tuple annotations finalized')

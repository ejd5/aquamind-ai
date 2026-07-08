# New Translation Keys Registry

Each phase-1 agent (1-a, 1-b, 1-c) writes its proposed new translation keys here as JSON:
- `.tmp/new-keys/agent-a.json` — keys proposed by Agent A (aquamind modules)
- `.tmp/new-keys/agent-b.json` — keys proposed by Agent B (landing + mobile + pages)
- `.tmp/new-keys/agent-c.json` — keys proposed by Agent C (lib data files)

## JSON Format

```json
{
  "namespace.path": {
    "keyName": {
      "fr": "French value",
      "en": "English value"
    },
    "anotherKey": {
      "fr": "...",
      "en": "..."
    }
  }
}
```

The phase-2 agent will merge these into all 7 locale files and translate to ES/DE/IT/PT/NL.

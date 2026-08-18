# AQWELIA — DeepSeek V4 + Pi Coding Harness

This repository is prepared to use Pi as the coding harness with DeepSeek V4.

## 1. Install Pi on macOS

Choose one official installation method:

```bash
npm install -g @mariozechner/pi-coding-agent
```

or:

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

Verify:

```bash
pi --version
```

## 2. Store the DeepSeek API key locally

Do not commit the key to this repository.

For zsh/macOS, add the environment variable locally:

```bash
export DEEPSEEK_API_KEY="sk-REPLACE_WITH_YOUR_KEY"
```

To persist it, add the export to your local `~/.zshrc`, then open a new terminal or run `source ~/.zshrc`.

## 3. Configure DeepSeek V4 models for Pi

Create `~/.pi/agent/models.json` with:

```json
{
  "providers": {
    "deepseek": {
      "baseUrl": "https://api.deepseek.com",
      "api": "openai-completions",
      "apiKey": "$DEEPSEEK_API_KEY",
      "models": [
        {
          "id": "deepseek-v4-pro",
          "name": "DeepSeek V4 Pro",
          "contextWindow": 1000000,
          "maxTokens": 384000,
          "input": ["text"],
          "reasoning": true,
          "thinkingLevelMap": {
            "minimal": null,
            "low": null,
            "medium": null,
            "high": "high",
            "xhigh": "max"
          },
          "compat": {
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          }
        },
        {
          "id": "deepseek-v4-flash",
          "name": "DeepSeek V4 Flash",
          "contextWindow": 1000000,
          "maxTokens": 384000,
          "input": ["text"],
          "reasoning": true,
          "thinkingLevelMap": {
            "minimal": null,
            "low": null,
            "medium": null,
            "high": "high",
            "xhigh": "max"
          },
          "compat": {
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          }
        }
      ]
    }
  }
}
```

The project `.pi/settings.json` selects `deepseek-v4-pro` with maximum reasoning (`xhigh`) by default for AQWELIA code changes.

## 4. Start the AQWELIA harness

From the repository root:

```bash
pi
```

Pi automatically loads:

- `.pi/settings.json`
- `AGENTS.md`
- `.pi/skills/aqwelia-release/SKILL.md`

For a release/PR mission, use:

```text
/skill:aqwelia-release
```

then provide the task.

## 5. Model strategy

Use V4 Pro for code changes, architecture, security, billing, migrations, CI failures and release decisions.

For cheap read-only exploration or simple repository questions, switch with `/model` to `deepseek-v4-flash`, then switch back to Pro before implementing sensitive changes.

## 6. Safety model

The repository rules intentionally require a human checkpoint before Ready, merge, Production deployment, Production DB/Stripe/Neon changes, or other irreversible actions.

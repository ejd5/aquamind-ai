# AQWELIA — DeepSeek V4 + Pi Coding Harness

This repository is prepared to use Pi as the coding harness with DeepSeek V4.

## 1. Install Pi

Choose one official installation method:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
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

## 3. DeepSeek is supported natively by Pi

No manual `~/.pi/agent/models.json` is required. Pi detects DeepSeek automatically from the `DEEPSEEK_API_KEY` environment variable.

From the repository root:

```bash
cd /chemin/vers/aquamind-ai
pi
```

The project configuration `.pi/settings.json` then selects automatically:

- provider = `deepseek`
- model = `deepseek-v4-pro`
- thinking = `max`

You can verify or change the model inside Pi at any time with:

```
/model
```

and choose:

- `deepseek-v4-pro`
- `deepseek-v4-flash`

Use V4 Pro for code changes, architecture, security, billing, migrations, CI failures and release decisions. For cheap read-only exploration or simple repository questions, switch with `/model` to `deepseek-v4-flash`, then switch back to Pro before implementing sensitive changes.

## 4. Project trust

On first launch inside the repository, Pi may ask you to trust the project.

Approve the AQWELIA repository to allow loading:

- `.pi/settings.json`
- `.pi/skills/`

`AGENTS.md` remains the repository rules context.

## 5. Start the AQWELIA harness

Pi automatically loads:

- `.pi/settings.json`
- `AGENTS.md`
- `.pi/skills/aqwelia-release/SKILL.md`

For a release/PR mission, use:

```text
/skill:aqwelia-release
```

then provide the task.

## 6. Safety model

The repository rules intentionally require a human checkpoint before Ready, merge, Production deployment, Production DB/Stripe/Neon changes, or other irreversible actions.

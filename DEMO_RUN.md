# Claude Efficiency OS Demo (HTML)

You can test the demo in two easy ways.

## Option A: Open directly
1. Open this file in your browser:
   - `web/index.html`
2. Click through tabs and use forms:
   - **Skill Builder**: generate SKILL.md text.
   - **Prompt Optimizer**: enter long prompt and click **Compress Prompt**.
   - **Token Center**: change token inputs and click **Calculate Waste Score**.

## Option B: Run local static server (recommended)
From repository root:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/web/index.html`

## What should work in demo
- Sidebar tab navigation
- Dashboard KPI cards
- Workflow vault list rendering
- Token waste score calculation
- Prompt compression mock (`ARCH_001`, `ARCH_002`, ...)
- SKILL.md generator output

# Deploy to Vercel

This repo is a static site. Vercel can deploy it directly.

## 1) Login and link project
```bash
npx vercel login
npx vercel link
```

## 2) Deploy preview
```bash
npx vercel
```

## 3) Deploy production
```bash
npx vercel --prod
```

## Expected routes
- `/` -> `web/index.html` (configured in `vercel.json`)
- `/web/index.html` direct app path
- `/demo.html` redirect page

## Notes
- No build step required.
- If prompted for framework, choose **Other**.

## 4) Enable auto-deploy via GitHub Actions
Add these repository secrets in GitHub:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Workflow file:
- `.github/workflows/vercel-deploy.yml`

Behavior:
- Pull Requests to `main` => preview deploy
- Push to `main` => production deploy

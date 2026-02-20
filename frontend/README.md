# SmartCD Frontend (Yield Demo)

Minimal React (Vite) single page that fetches current yield from backend.

## Environment variables

- `VITE_ENV_NAME`: visible environment label (`staging`, `production`, etc.)

Create `.env` from `.env.example` and set values per environment.
For Vite modes, you can also create:
- `.env.staging`
- `.env.production`

## Run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Mode-specific examples:

```bash
npm run build -- --mode staging
npm run build -- --mode production
```

## Vercel deployment variables

Set these in Vercel project settings:
- `VITE_ENV_NAME`

Recommended:
- Production branch (`main`): `VITE_ENV_NAME=production`
- Staging branch (`staging`): `VITE_ENV_NAME=staging`

# SmartCD Backend (FastAPI)

Production-ready minimal FastAPI backend with:
- Environment separation (`ENVIRONMENT=production|staging|development`)
- PostgreSQL via SQLAlchemy ORM
- Health endpoint
- Yield endpoint backed by the `yields` table

## Project structure

```text
smartcd-backend/
  app/
    config.py
    database.py
    main.py
    models.py
    schemas.py
  .env.example
  requirements.txt
```

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `PROD_DATABASE_URL`: production PostgreSQL URL
- `STAGING_DATABASE_URL`: staging/development PostgreSQL URL
- `ENVIRONMENT`: `production`, `staging`, or `development`
- `CORS_ALLOWED_ORIGINS`: Comma-separated allowed frontend origins
- `PROD_CORS_ALLOWED_ORIGINS`: Optional production-only CORS origins
- `STAGING_CORS_ALLOWED_ORIGINS`: Optional staging/development-only CORS origins

Environment separation behavior:
- `ENVIRONMENT` is required and must be one of `production|staging|development`.
- In `production`, `PROD_DATABASE_URL` is required and CORS origins must be explicitly configured.
- In `staging`, `STAGING_DATABASE_URL` is required.
- In `development`, `STAGING_DATABASE_URL` is preferred with `DATABASE_URL` as fallback.

## Local run

1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and set your real database URLs.
4. Start server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Endpoints

- `GET /health` -> `{ "status": "OK" }`
- `GET /yield` -> `{ "yield": <number> }`
  - Reads the latest row in table `yields` ordered by `id DESC`.
  - Returns `503` if database is unreachable.
  - Returns `404` if no yield rows exist.

## Database expectation

The endpoint expects a table:

```sql
CREATE TABLE yields (
  id SERIAL PRIMARY KEY,
  value NUMERIC NOT NULL
);
```

If your column name differs, update `app/models.py`.

## Railway deployment variables

Set these in Railway service settings:
- `ENVIRONMENT` (`production` on main, `staging` on staging branch)
- `PROD_DATABASE_URL`
- `STAGING_DATABASE_URL`
- `PROD_CORS_ALLOWED_ORIGINS`
- `STAGING_CORS_ALLOWED_ORIGINS`

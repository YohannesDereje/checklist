# Bete Dokimas — Team Checklist

A standalone ticket board for the Bete Dokimas wedding team: tabs for
Yohannes / Bersabeh / Yakob / Logistics / All Tasks, a branded header with a
percent-complete progress bar, and a collapsible Completed section. No
login — anyone with the deployed URL can use it.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**No database setup required to try it.** If `POSTGRES_URL` isn't set, the
app automatically stores tickets in a local JSON file at `.data/tickets.json`
(gitignored) so you can use the full board right away. Nothing here talks to
a real database until you add one.

## Adding a real (shared) database

For the board to be shared across all 3 people once deployed, add a Postgres
database:

1. In your Vercel project dashboard, go to **Storage** → create a Postgres
   database (via Neon, or any Postgres provider in the Marketplace) and
   connect it to this project. Vercel will add a `POSTGRES_URL` environment
   variable automatically.
2. Open that database's **Query** tab (or connect with any Postgres client)
   and run the contents of [`db/schema.sql`](db/schema.sql) once.
3. For local development against the same database, copy the connection
   string into `.env.local`:

   ```
   POSTGRES_URL=your-connection-string-here
   ```

Once `POSTGRES_URL` is set (locally or in Vercel), the app uses it instead
of the local JSON fallback automatically — no code changes needed.

## Deploying

Push this repo to GitHub, import it on [vercel.com/new](https://vercel.com/new),
add the Postgres integration from **Storage** as above, and deploy.

# DON’T JUMP leaderboard

Cloudflare Worker and D1 database for the public daily leaderboard.

[Deploy the leaderboard to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/Eric3uy51752i6/dont-jump/tree/main/leaderboard-worker)

After deployment, copy the Worker URL into `assets/js/leaderboard-config.js`. The site calls `/api/health` first, which safely creates any missing tables. The checked-in migration remains available for normal database migration workflows.

## Local validation

```bash
npm install
npm run check
npx wrangler d1 migrations apply dont-jump-scores --local
npm run dev
```

The API exposes:

- `GET /api/health`
- `GET /api/daily`
- `GET /api/leaderboard?date=YYYY-MM-DD`
- `POST /api/scores`

Scores are user-submitted and should be displayed as unverified. The API validates inputs, keeps only a player's best daily score, restricts browser origins, and rate-limits submissions using short-lived hashed network identifiers.

The browser client accepts score submissions only from the official GitHub Pages origin. Callsigns come from a controlled word list, scores are player-submitted, only a player’s best run is retained each day, request bodies are bounded, and submissions are rate-limited with short-lived hashed identifiers.

# Cinemind

**A personalized movie & TV recommendation engine for Stremio**

Cinemind is a self-hosted Stremio addon that analyzes your watch history from Stremio, MDBlist, or Nuvio, and generates tailored recommendations using TMDB, Trakt, and AniList.

## Features

- **Multi-source watch history** — import your library from Stremio, MDBlist, or Nuvio
- **Multiple recommendation engines** — TMDB discovery, Trakt recommendations, AniList trending
- **Configurable catalogs** — filter by genre, era, rating, sort order, and more
- **Encrypted storage** — your API keys and tokens are encrypted with AES-256-GCM before being stored
- **Self-hosted** — runs in Docker with full control over your data
- **Admin debug panel** — inspect watch history and troubleshoot integrations

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Docker](https://docker.com/) (optional, for containerized deployment)

### Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/CmdPrmpt/Cinemind.git
   cd Cinemind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `ENCRYPTION_KEY` (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

4. **Start the server**
   ```bash
   npm start
   ```

   The addon will be available at `http://localhost:7000`.

### Docker Deployment

```bash
docker compose up -d
```

For production with Traefik, update `docker-compose.yml` with your domain and ensure the `traefik_net` network exists.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | ✅ Yes | Master encryption key (min 32 chars) for encrypting user configs |
| `SUPABASE_URL` | ❌ No* | Supabase project URL (needed for Nuvio integration) |
| `SUPABASE_PUBLISHABLE_KEY` | ❌ No* | Supabase anon/publishable key (needed for Nuvio integration) |
| `PORT` | ❌ No | Server port (default: `7000`) |
| `NODE_ENV` | ❌ No | Environment mode (default: `production`) |
| `STATS_USER` | ❌ No | Username for the debug panel HTTP Basic Auth |
| `STATS_PASS` | ❌ No | Password for the debug panel HTTP Basic Auth |
| `DOCKER_NETWORK` | ❌ No | Docker network name for Traefik (default: `aio_network`) |

*\*Required if using Nuvio as a library source.*

## Routes

| Route | Description |
|---|---|
| `/` | Landing page / configuration UI |
| `/health` | Health check endpoint |
| `/manifest.json` | Stremio addon manifest |
| `/catalog/*` | Stremio catalog endpoints |
| `/stream/*` | Stremio stream endpoints |
| `/api/*` | Configuration API (save/load/validate) |
| `/debug/*` | Admin debug panel (requires auth if configured) |

## API Sources

- **[TMDB](https://www.themoviedb.org/)** — Movie/series discovery and recommendations
- **[Trakt](https://trakt.tv/)** — Personalized recommendations
- **[AniList](https://anilist.co/)** — Anime recommendations and trending
- **[MDBlist](https://mdblist.com/)** — Watch history and library
- **[Stremio](https://stremio.com/)** — Watch history and user data
- **[Nuvio](https://nuvio.tv/)** — Watch progress and profiles (via Supabase)

## Security

- User API keys and tokens are encrypted with **AES-256-GCM** before storage
- The master encryption key is provided via the `ENCRYPTION_KEY` environment variable — **never hardcoded**
- All passwords and sensitive fields are encrypted with an optional per-user passphrase
- HTTP security headers via **Helmet** with strict CSP
- **Rate limiting** on API endpoints
- **CORS** restricted to whitelisted origins
- Docker image runs as a **non-root user**

## License

[MIT](LICENSE)

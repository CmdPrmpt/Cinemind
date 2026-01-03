# Cinemind

A Stremio addon that generates personalized movie and TV recommendations based on your watch history.

## What It Does

Cinemind analyzes your watch history from Stremio or MDBlist and creates recommendation catalogs that appear directly in your Stremio home screen. It pulls recommendations from TMDB, Trakt, and AniList based on what you've already watched.

## Features

### Library Sources
- **Stremio** - Uses your Stremio library and watch history
- **MDBlist** - Uses your MDBlist scrobble data

### Recommendation Engines
- **TMDB** - Content-based matching (similar genres, plots)
- **Trakt** - Collaborative filtering (users who watched X also watched Y)
- **AniList** - Anime-specific recommendations

### Catalogs
- Recommended Movies
- Recommended Series
- Anime Movies
- Anime Series
- Cast & Crew recommendations (find more work by directors/actors you like)

### Filtering Options
- **Hide Watched** - Remove items you've already seen
- **Genre Exclusions** - Exclude specific genres per catalog
- **Minimum Rating** - Filter by TMDB rating threshold
- **Era Filter** - Modern (2010+), 2000s, 90s, or Classic (<1990)
- **Language Filter** - Filter by original language

### Customization
- Rename catalogs to whatever you want
- Reorder catalogs via drag-and-drop
- Choose output ID format per content type (TMDB, IMDB, TVDB, Kitsu, MAL)
- RPDB poster support (requires RPDB key)
- Auto-fill empty catalogs with trending content

### Security
- Password protection for configurations
- AES-256-GCM encryption for stored API keys
- No API keys stored in URLs

## Setup

### Requirements
- Node.js 18+
- TMDB API key (free at themoviedb.org)
- Stremio auth key or MDBlist API key & TMDB API key

### Local Installation

```bash
git clone https://github.com/yourusername/cinemind.git
cd cinemind
npm install
cp .env.example .env
# Edit .env with your encryption key
npm start
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | 32+ character key for encrypting configs |
| `PORT` | No | Server port (default: 7000) |
| `STATS_USER` | No | Username for /api/stats endpoint |
| `STATS_PASS` | No | Password for /api/stats endpoint |

## Usage

1. Open `http://localhost:7000` in your browser
2. Enter your Stremio auth key or MDBlist API key
3. Enter your TMDB API key
4. Configure catalogs and filters
5. Set a password to protect your config
6. Click "Generate Addon"
7. Click "Install in Stremio"

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Configuration page |
| `GET /:token/manifest.json` | Addon manifest |
| `GET /:token/catalog/:type/:id.json` | Catalog data |
| `POST /api/encrypt-config` | Generate encrypted config token |
| `POST /api/decrypt-config` | Decrypt config for editing |
| `GET /api/stats` | Usage statistics (requires auth) |

## How It Works

1. Fetches your watch history from chosen source
2. Resolves items to TMDB IDs
3. Fetches recommendations from enabled engines
4. Filters results based on your preferences
5. Converts IDs to your preferred output format
6. Caches results with stale-while-revalidate strategy

## Acknowledgments

Inspired by [Watchly](https://github.com/TimilsinaBimal/Watchly) by TimilsinaBimal.

## License

MIT

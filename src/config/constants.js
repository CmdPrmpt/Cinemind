const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TRAKT_BASE_URL = 'https://api.trakt.tv';
const STREMIO_API_URL = 'https://api.strem.io/api/datastoreGet';
const ARM_API_URL = 'https://arm.haglund.dev/api/v2/ids';
const ANILIST_API_URL = 'https://graphql.anilist.co';
const PLEXANIBRIDGE_API = 'https://plexanibridge-api.elias.eu.org/api/v2/search';
const MDBLIST_API_URL = 'https://api.mdblist.com';

const MOVIE_GENRES = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
    "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
    "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Sci-Fi": 878,
    "Thriller": 53, "War": 10752, "Western": 37
};

const SERIES_GENRES = {
    "Action & Adventure": 10759, "Animation": 16, "Comedy": 35, "Crime": 80,
    "Documentary": 99, "Drama": 18, "Family": 10751, "Kids": 10762, "Mystery": 9648,
    "News": 10763, "Reality": 10764, "Sci-Fi & Fantasy": 10765, "Soap": 10766,
    "Talk": 10767, "War & Politics": 10768, "Western": 37
};

const MOVIE_GENRE_LIST = Object.keys(MOVIE_GENRES);
const SERIES_GENRE_LIST = Object.keys(SERIES_GENRES);

const VALID_ID_TYPES = ['tmdb', 'imdb', 'tvdb', 'kitsu', 'mal'];
const VALID_ENGINES = ['tmdb', 'trakt', 'both'];
const VALID_ANIME_ENGINES = ['anilist'];
const VALID_SORT_ORDERS = ['random', 'rating_desc', 'date_desc', 'popularity_desc'];
const VALID_INPUT_MODES = ['recent', 'random'];
const VALID_LIBRARY_SOURCES = ['stremio', 'mdblist'];

const CACHE_TTL = {
    LIBRARY: 900000,
    ID_MAP: 604800000,
    DETAILS: 259200000,
    EXTERNAL_IDS: 2592000000,
    DISCOVERY: 172800000,
    CATALOG: 86400000,
    ANILIST_TRENDING: 86400000,
    NEGATIVE: 86400000
};

const CATALOG_DEFINITIONS = {
    'std_mov': {
        type: 'movie',
        id: 'personalized_recs_movies',
        name: 'Recommended Movies',
        extra: [{ name: 'genre', options: MOVIE_GENRE_LIST }]
    },
    'std_ser': {
        type: 'series',
        id: 'personalized_recs_series',
        name: 'Recommended Series',
        extra: [{ name: 'genre', options: SERIES_GENRE_LIST }]
    },
    'ani_mov': {
        type: 'movie',
        id: 'personalized_recs_anime_movies',
        name: 'Recommended Anime Movies'
    },
    'ani_ser': {
        type: 'series',
        id: 'personalized_recs_anime_series',
        name: 'Recommended Anime Series'
    },
    'crew_mov': {
        type: 'movie',
        id: 'personalized_crew_movies',
        name: 'Recommended by Cast & Crew (Movies)'
    },
    'crew_ser': {
        type: 'series',
        id: 'personalized_crew_series',
        name: 'Recommended by Cast & Crew (Series)'
    }
};

const SUPPORTED_CATALOG_IDS = [
    'personalized_recs_movies', 'personalized_recs_series',
    'personalized_recs_anime_movies', 'personalized_recs_anime_series',
    'personalized_crew_movies', 'personalized_crew_series'
];

module.exports = {
    TMDB_BASE_URL,
    TRAKT_BASE_URL,
    STREMIO_API_URL,
    ARM_API_URL,
    ANILIST_API_URL,
    PLEXANIBRIDGE_API,
    MDBLIST_API_URL,
    MOVIE_GENRES,
    SERIES_GENRES,
    MOVIE_GENRE_LIST,
    SERIES_GENRE_LIST,
    VALID_ID_TYPES,
    VALID_ENGINES,
    VALID_ANIME_ENGINES,
    VALID_SORT_ORDERS,
    VALID_INPUT_MODES,
    VALID_LIBRARY_SOURCES,
    CACHE_TTL,
    CATALOG_DEFINITIONS,
    SUPPORTED_CATALOG_IDS
};

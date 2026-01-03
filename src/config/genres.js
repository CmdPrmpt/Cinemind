const TMDB_MOVIE_GENRES = [
    "Action", "Adventure", "Animation", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "History",
    "Horror", "Music", "Mystery", "Romance", "Science Fiction",
    "TV Movie", "Thriller", "War", "Western"
];

const TMDB_TV_GENRES = [
    "Action & Adventure", "Animation", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Kids", "Mystery",
    "News", "Reality", "Sci-Fi & Fantasy", "Soap",
    "Talk", "War & Politics", "Western"
];

const ANIME_GENRES = [
    "Action", "Adventure", "Comedy", "Drama", "Ecchi",
    "Fantasy", "Horror", "Isekai", "Iyashikei", "Josei",
    "Mahou Shoujo", "Mecha", "Music", "Mystery",
    "Psychological", "Romance", "Sci-Fi", "Seinen",
    "Shoujo", "Shonen", "Slice of Life", "Sports",
    "Supernatural", "Thriller"
];

const TMDB_GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

module.exports = {
    TMDB_MOVIE_GENRES,
    TMDB_TV_GENRES,
    ANIME_GENRES,
    TMDB_GENRE_MAP
};

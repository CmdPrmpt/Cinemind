function calculateEngagementScore(item) {
    const state = item.state || {};
    let score = 0;
    const lastWatched = new Date(state.lastWatched || 0).getTime();
    const daysSinceWatch = (Date.now() - lastWatched) / (1000 * 60 * 60 * 24);

    if (item.name && !item.state.season) {
        if (state.flaggedAsWatched) {
            score = 50;
        } else if (state.timeOffset && state.duration) {
            const progress = state.timeOffset / state.duration;
            if (progress > 0.9) score = 50;
            else if (progress > 0.15) score = 15;
        }
    } else {
        const season = state.season || 0;
        const episode = state.episode || 0;
        if (season > 1) {
            score = ((season - 1) * 20) + (episode * 2);
        } else if (season === 1) {
            score = (episode > 5) ? 20 : (episode > 1 ? 10 : 1);
        }
    }

    if (score < 30 && daysSinceWatch < 3) score += 15;

    const decay = Math.min(Math.floor(daysSinceWatch / 30), 20);
    return Math.max(score - decay, 0);
}

async function getWatchHistory(config, limit, targetType, inputMode, services = {}) {
    const librarySource = config.librarySource || 'stremio';

    if (librarySource === 'mdblist') {
        const getMDBlistWatchHistory = services.getMDBlistWatchHistory ||
            require('../services/mdblist').getMDBlistWatchHistory;
        return getMDBlistWatchHistory(config.mdblistApiKey, limit, targetType, inputMode);
    }

    const getUserWatchHistory = services.getUserWatchHistory ||
        require('../services/stremio').getUserWatchHistory;
    return getUserWatchHistory(config.authKey, limit, targetType, inputMode);
}

module.exports = {
    calculateEngagementScore,
    getWatchHistory
};

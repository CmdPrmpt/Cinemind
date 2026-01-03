const { getCatalogDisplayName } = require('./utils');

class PerformanceMonitor {
    constructor(id) {
        this.id = id;
        this.stats = {};
    }

    record(service, category, duration) {
        if (!this.stats[service]) this.stats[service] = {};
        if (!this.stats[service][category]) {
            this.stats[service][category] = { count: 0, time: 0, max: 0 };
        }

        this.stats[service][category].count++;
        this.stats[service][category].time += duration;
        this.stats[service][category].max = Math.max(this.stats[service][category].max, duration);
    }

    printSummary(filledCount) {
        console.log(`\nCATALOG - ${getCatalogDisplayName(this.id)}:`);
        const rows = [];

        for (const service in this.stats) {
            for (const cat in this.stats[service]) {
                const d = this.stats[service][cat];
                rows.push({
                    Service: service,
                    Category: cat,
                    Requests: d.count,
                    'Max(ms)': d.max.toFixed(0),
                    'Avg(ms)': (d.time / d.count).toFixed(0)
                });
            }
        }

        console.table(rows);

        if (filledCount !== undefined) {
            console.log(`Filled ${filledCount} results using Gap Fill`);
        }
        console.log('');
    }
}

module.exports = PerformanceMonitor;

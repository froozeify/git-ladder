/**
 * DataService Class
 *
 * Handles loading and processing of GitHub statistics data.
 * Provides methods for filtering and aggregating data by time period and metric.
 */
class DataService {
    constructor() {
        this.data = null;
        this.isLoaded = false;
    }

    /**
     * Loads statistics data from the JSON file
     * @returns {Promise<Object>} The loaded data
     */
    async loadData() {
        try {
            const response = await fetch('data/stats.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.isLoaded = true;
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Gets the last updated timestamp
     * @returns {string} Formatted date string
     */
    getLastUpdated() {
        if (!this.data) return 'Never';
        const date = new Date(this.data.lastUpdated);
        // 'en-CA' locale uses YYYY-MM-DD format
        const dateStr = date.toLocaleDateString('en-CA');
        const timeStr = date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Gets the list of tracked organizations
     * @returns {Array<string>} List of organization names
     */
    getOrganizations() {
        if (!this.data) return [];
        return this.data.organizations || [];
    }

    /**
     * Gets all available years from the data
     * @returns {Array<string>} List of years
     */
    getAvailableYears() {
        if (!this.data) return [];

        const years = new Set();

        Object.values(this.data.users).forEach(user => {
            Object.keys(user.commits || {}).forEach(year => years.add(year));
            Object.keys(user.pullRequests || {}).forEach(year => years.add(year));
        });

        return Array.from(years).sort().reverse();
    }

    /**
     * Gets aggregated statistics for the selected period
     * @param {Object} filters - Filter options (year, month, excludedUsers)
     * @returns {Object} Aggregated stats (commits, pullRequests, contributors)
     */
    getAggregatedStats(filters) {
        const stats = this.getUserStats(filters);

        return stats.reduce((acc, user) => {
            acc.commits += user.commits;
            acc.pullRequests += user.pullRequests;
            acc.contributors++;
            return acc;
        }, { commits: 0, pullRequests: 0, contributors: 0 });
    }

    /**
     * Gets all unique usernames from the data
     * @returns {Array<string>} Sorted list of usernames
     */
    getAllUsernames() {
        if (!this.data) return [];
        return Object.keys(this.data.users).sort();
    }

    /**
     * Gets aggregated statistics for all users based on filters
     * @param {Object} options - Filter options
     * @param {string} options.year - Year to filter by ('all' for all years)
     * @param {string} options.month - Month to filter by ('all' for all months)
     * @param {string} options.metric - Metric type ('commits' or 'pullRequests')
     * @param {Array<string>} options.excludedUsers - List of usernames to exclude
     * @returns {Array<Object>} Sorted array of user statistics
     */
    getUserStats({ year = 'all', month = 'all', metric = 'commits', excludedUsers = [] } = {}) {
        if (!this.data) return [];

        const results = [];

        for (const [username, userData] of Object.entries(this.data.users)) {
            // Skip excluded users
            if (excludedUsers.includes(username)) {
                continue;
            }
            const metricData = userData[metric] || {};
            let total = 0;

            if (year === 'all') {
                // Sum all years
                for (const yearData of Object.values(metricData)) {
                    if (month === 'all') {
                        total += yearData.total || 0;
                    } else {
                        total += yearData.months?.[month] || 0;
                    }
                }
            } else {
                // Specific year
                const yearData = metricData[year];
                if (yearData) {
                    if (month === 'all') {
                        total = yearData.total || 0;
                    } else {
                        total = yearData.months?.[month] || 0;
                    }
                }
            }

            if (total > 0) {
                results.push({
                    username,
                    avatar: userData.avatar,
                    value: total,
                    commits: this.getMetricValue(userData, 'commits', year, month),
                    pullRequests: this.getMetricValue(userData, 'pullRequests', year, month)
                });
            }
        }

        // Sort by value descending
        return results.sort((a, b) => b.value - a.value);
    }

    /**
     * Gets the value for a specific metric
     * @private
     */
    getMetricValue(userData, metric, year, month) {
        const metricData = userData[metric] || {};
        let total = 0;

        if (year === 'all') {
            for (const yearData of Object.values(metricData)) {
                if (month === 'all') {
                    total += yearData.total || 0;
                } else {
                    total += yearData.months?.[month] || 0;
                }
            }
        } else {
            const yearData = metricData[year];
            if (yearData) {
                if (month === 'all') {
                    total = yearData.total || 0;
                } else {
                    total = yearData.months?.[month] || 0;
                }
            }
        }

        return total;
    }

    /**
     * Gets monthly trend data for top users
     * @param {Object} options - Filter options
     * @param {string} options.year - Year to get trends for
     * @param {string} options.metric - Metric type
     * @param {number} options.topN - Number of top users to include
     * @param {Array<string>} options.excludedUsers - List of usernames to exclude
     * @returns {Object} Trend data with labels and datasets
     */
    getTrendData({ year, metric = 'commits', topN = 10, excludedUsers = [] } = {}) {
        if (!this.data) return null;

        // Get top users for the selected period
        const topUsers = this.getUserStats({ year, month: 'all', metric, excludedUsers }).slice(0, topN);

        // Handle "All Years" - Show yearly trend
        if (year === 'all') {
            const years = this.getAvailableYears().sort(); // Ascending for chart
            
            const datasets = topUsers.map((user, index) => {
                const userData = this.data.users[user.username];
                const metricData = userData[metric] || {};
                
                return {
                    label: user.username,
                    data: years.map(y => metricData[y]?.total || 0),
                    borderColor: this.getChartColor(index),
                    backgroundColor: this.getChartColor(index, 0.2),
                    tension: 0.3,
                    fill: false
                };
            });
            
            return {
                labels: years,
                datasets
            };
        }

        // Handle Specific Year - Show monthly trend
        let months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        let monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // If current year is selected, only show up to current month
        const currentYear = new Date().getFullYear().toString();
        if (year === currentYear) {
            const currentMonthIndex = new Date().getMonth(); // 0-11
            months = months.slice(0, currentMonthIndex + 1);
            monthLabels = monthLabels.slice(0, currentMonthIndex + 1);
        }

        const datasets = topUsers.map((user, index) => {
            const userData = this.data.users[user.username];
            const metricData = userData[metric]?.[year]?.months || {};

            return {
                label: user.username,
                data: months.map(m => metricData[m] || 0),
                borderColor: this.getChartColor(index),
                backgroundColor: this.getChartColor(index, 0.2),
                tension: 0.3,
                fill: false
            };
        });

        return {
            labels: monthLabels,
            datasets
        };
    }

    /**
     * Gets a chart color by index
     * @private
     */
    getChartColor(index, alpha = 1) {
        const colors = [
            `rgba(88, 166, 255, ${alpha})`,
            `rgba(63, 185, 80, ${alpha})`,
            `rgba(210, 153, 34, ${alpha})`,
            `rgba(248, 81, 73, ${alpha})`,
            `rgba(163, 113, 247, ${alpha})`,
            `rgba(219, 97, 162, ${alpha})`,
            `rgba(121, 192, 255, ${alpha})`,
            `rgba(126, 231, 135, ${alpha})`,
            `rgba(227, 179, 65, ${alpha})`,
            `rgba(255, 123, 114, ${alpha})`
        ];
        return colors[index % colors.length];
    }
}

// Export for use in other scripts
window.DataService = DataService;

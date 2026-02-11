/**
 * App Class
 *
 * Main application controller that initializes services,
 * binds event handlers, and coordinates UI updates.
 */
class App {
    constructor() {
        this.dataService = new DataService();
        this.chartManager = new ChartManager();

        // Current filter state
        this.filters = {
            year: 'all',
            month: 'all',
            metric: 'pullRequests',
            excludedUsers: ['dependabot[bot]'] // Default excluded users
        };

        // DOM elements
        this.elements = {
            lastUpdated: document.getElementById('lastUpdated'),
            yearSelect: document.getElementById('yearSelect'),
            monthSelect: document.getElementById('monthSelect'),
            excludedUsersChips: document.getElementById('excludedUsersChips'),
            toggleBtns: document.querySelectorAll('.toggle-btn'),
            leaderboardChart: document.getElementById('leaderboardChart'),
            trendChart: document.getElementById('trendChart'),
            trendChartSection: document.getElementById('trendChartSection'),
            usersGrid: document.getElementById('usersGrid'),
            orgBadges: document.getElementById('orgBadges'),
            footerLinks: document.getElementById('footerLinks'),
            kpiCommits: document.getElementById('kpiCommits'),
            kpiPRs: document.getElementById('kpiPRs'),
            kpiReviews: document.getElementById('kpiReviews'),
            kpiContributors: document.getElementById('kpiContributors')
        };
    }

    /**
     * Initializes the application
     */
    async init() {
        try {
            // Show loading state
            this.showLoading();

            // Load data
            await this.dataService.loadData();

            // Update UI
            this.updateLastUpdated();
            this.updateOrganizations();
            this.populateYearSelect();
            this.bindEventHandlers();

            // Listen for theme changes to update charts
            window.addEventListener('themechange', () => {
                this.render();
            });

            // Initial render
            this.render();
        } catch (error) {
            this.showError('Failed to load data. Please try again later.');
            console.error('Initialization error:', error);
        }
    }

    /**
     * Shows loading state in the UI
     */
    showLoading() {
        this.elements.usersGrid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Loading statistics...</span>
            </div>
        `;
    }

    /**
     * Shows an error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.elements.usersGrid.innerHTML = `
            <div class="error-message">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }

    /**
     * Updates the last updated timestamp
     */
    updateLastUpdated() {
        this.elements.lastUpdated.textContent = `Last updated: ${this.dataService.getLastUpdated()}`;
    }

    /**
     * Updates organization badges and footer links
     */
    updateOrganizations() {
        const organizations = this.dataService.getOrganizations();

        // Update header badges
        if (this.elements.orgBadges) {
            this.elements.orgBadges.innerHTML = organizations
                .map(org => this.createOrgLink(org, 'org-badge'))
                .join('');
        }

        // Update footer links
        if (this.elements.footerLinks) {
            this.elements.footerLinks.innerHTML = organizations
                .map(org => this.createOrgLink(org))
                .join('<span>•</span>');
        }
    }

    /**
     * Creates an HTML link for an organization
     * @param {string} org - Organization name
     * @param {string} className - Optional class name
     * @returns {string} HTML string for the link
     */
    createOrgLink(org, className = '') {
        const classAttr = className ? ` class="${className}"` : '';
        return `<a href="https://github.com/${org}" target="_blank"${classAttr}>${org}</a>`;
    }

    /**
     * Populates the year select dropdown
     */
    populateYearSelect() {
        const years = this.dataService.getAvailableYears();
        const currentYear = new Date().getFullYear().toString();

        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.elements.yearSelect.appendChild(option);
        });

        // Select current year by default if available
        if (years.includes(currentYear)) {
            this.elements.yearSelect.value = currentYear;
            this.filters.year = currentYear;
        }
    }

    /**
     * Binds event handlers to UI elements
     */
    bindEventHandlers() {
        // Year select
        this.elements.yearSelect.addEventListener('change', (e) => {
            this.filters.year = e.target.value;

            // If "All time" (all) is selected for year, force month to "All months"
            if (this.filters.year === 'all') {
                this.filters.month = 'all';
                this.elements.monthSelect.value = 'all';
            }

            this.render();
        });

        // Month select
        this.elements.monthSelect.addEventListener('change', (e) => {
            this.filters.month = e.target.value;
            this.render();
        });

        // Metric toggle buttons
        this.elements.toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filters.metric = btn.dataset.metric;
                this.render();
            });
        });
    }

    /**
     * Renders all UI components with current filters
     */
    render() {
        const stats = this.dataService.getUserStats(this.filters);
        const metricLabels = { commits: 'Commits', pullRequests: 'Pull Requests', codeReviews: 'Code Reviews' };
        const metricLabel = metricLabels[this.filters.metric] || 'Commits';

        // Update charts
        this.chartManager.createLeaderboardChart(
            this.elements.leaderboardChart,
            stats,
            metricLabel,
            (username) => this.handleChartClick(username)
        );

        const trendData = this.dataService.getTrendData({
            year: this.filters.year,
            metric: this.filters.metric,
            topN: 10,
            excludedUsers: this.filters.excludedUsers
        });

        // Hide trend chart if specific month selected, or if no data
        if (this.filters.month !== 'all' || !trendData) {
            this.elements.trendChartSection.style.display = 'none';
        } else {
            this.elements.trendChartSection.style.display = 'block';
            this.chartManager.createTrendChart(this.elements.trendChart, trendData);
        }

        // Update user cards
        this.renderUserCards(stats);

        // Update excluded user chips
        this.renderExcludedChips();

        // Update KPIs
        this.updateKPIs();
    }

    /**
     * Handles click on chart bar to exclude/include user
     * @param {string} username - Username that was clicked
     */
    handleChartClick(username) {
        const index = this.filters.excludedUsers.indexOf(username);

        if (index === -1) {
            // Add to excluded users
            this.filters.excludedUsers.push(username);
        } else {
            // Remove from excluded users
            this.filters.excludedUsers.splice(index, 1);
        }

        // Re-render
        this.render();
    }

    /**
     * Renders excluded user chips
     */
    renderExcludedChips() {
        if (!this.elements.excludedUsersChips) return;

        if (this.filters.excludedUsers.length === 0) {
            this.elements.excludedUsersChips.innerHTML = '';
            return;
        }

        this.elements.excludedUsersChips.innerHTML = this.filters.excludedUsers.map(username => `
            <div class="user-chip" onclick="app.removeExcludedUser('${username}')">
                <span>${username}</span>
                <button class="user-chip-remove" aria-label="Remove ${username}">
                    ×
                </button>
            </div>
        `).join('');
    }

    /**
     * Removes a user from the excluded list
     * @param {string} username - Username to remove from exclusions
     */
    removeExcludedUser(username) {
        const index = this.filters.excludedUsers.indexOf(username);
        if (index !== -1) {
            this.filters.excludedUsers.splice(index, 1);
            this.render();
        }
    }

    /**
     * Renders user cards in the grid
     * @param {Array} stats - User statistics data
     */
    renderUserCards(stats) {
        if (stats.length === 0) {
            this.elements.usersGrid.innerHTML = `
                <div class="error-message">
                    <p>No data available for the selected filters.</p>
                </div>
            `;
            return;
        }

        this.elements.usersGrid.innerHTML = stats.map((user, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';

            return `
                <div class="user-card">
                    <button class="user-card-exclude" onclick="app.handleChartClick('${user.username}')" aria-label="Exclude ${user.username}" title="Exclude user">
                        ×
                    </button>
                    <span class="user-rank ${rankClass}">#${rank}</span>
                    <img class="user-avatar" src="${user.avatar}" alt="${user.username}" loading="lazy">
                    <div class="user-info">
                        <div class="user-name">
                            <a href="https://github.com/${user.username}" target="_blank" rel="noopener">
                                ${user.username}
                            </a>
                        </div>
                        <div class="user-stats">
                            <span class="stat-item">
                                <span class="stat-value">${user.commits.toLocaleString()}</span> commits
                            </span>
                            <span class="stat-item">
                                <span class="stat-value">${user.pullRequests.toLocaleString()}</span> PRs
                            </span>
                            <span class="stat-item">
                                <span class="stat-value">${user.codeReviews.toLocaleString()}</span> Reviews
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Updates KPI cards with animated values
     */
    updateKPIs() {
        const stats = this.dataService.getAggregatedStats(this.filters);

        this.animateValue(this.elements.kpiCommits, parseInt(this.elements.kpiCommits.dataset.value || 0), stats.commits, 1000);
        this.elements.kpiCommits.dataset.value = stats.commits;

        this.animateValue(this.elements.kpiPRs, parseInt(this.elements.kpiPRs.dataset.value || 0), stats.pullRequests, 1000);
        this.elements.kpiPRs.dataset.value = stats.pullRequests;

        this.animateValue(this.elements.kpiReviews, parseInt(this.elements.kpiReviews.dataset.value || 0), stats.codeReviews, 1000);
        this.elements.kpiReviews.dataset.value = stats.codeReviews;

        this.animateValue(this.elements.kpiContributors, parseInt(this.elements.kpiContributors.dataset.value || 0), stats.contributors, 1000);
        this.elements.kpiContributors.dataset.value = stats.contributors;
    }

    /**
     * Animates a number from start to end value
     * @param {HTMLElement} obj - Element to update
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} duration - Animation duration in ms
     */
    animateValue(obj, start, end, duration) {
        if (!obj) return;

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // Earings function for smoother animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = value.toLocaleString();

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end.toLocaleString();
            }
        };
        window.requestAnimationFrame(step);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

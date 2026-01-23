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
            metric: 'commits'
        };
        
        // DOM elements
        this.elements = {
            lastUpdated: document.getElementById('lastUpdated'),
            yearSelect: document.getElementById('yearSelect'),
            monthSelect: document.getElementById('monthSelect'),
            toggleBtns: document.querySelectorAll('.toggle-btn'),
            leaderboardChart: document.getElementById('leaderboardChart'),
            trendChart: document.getElementById('trendChart'),
            trendChartSection: document.getElementById('trendChartSection'),
            usersGrid: document.getElementById('usersGrid'),
            orgBadges: document.getElementById('orgBadges'),
            footerLinks: document.getElementById('footerLinks')
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
        const metricLabel = this.filters.metric === 'commits' ? 'Commits' : 'Pull Requests';
        
        // Update charts
        this.chartManager.createLeaderboardChart(
            this.elements.leaderboardChart,
            stats,
            metricLabel
        );
        
        const trendData = this.dataService.getTrendData({
            year: this.filters.year,
            metric: this.filters.metric,
            topN: 10
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
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

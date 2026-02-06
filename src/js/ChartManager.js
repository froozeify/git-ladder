/**
 * ChartManager Class
 *
 * Manages Chart.js instances for the leaderboard and trend visualizations.
 * Provides methods to create, update, and destroy charts.
 */
class ChartManager {
    constructor() {
        this.leaderboardChart = null;
        this.trendChart = null;
    }

    /**
     * Gets chart colors from CSS custom properties
     * This allows colors to update automatically when theme changes
     * @returns {Array<string>} Array of chart colors
     */
    getChartColors() {
        const style = getComputedStyle(document.documentElement);
        return [
            style.getPropertyValue('--chart-color-1').trim() || '#58a6ff',
            style.getPropertyValue('--chart-color-2').trim() || '#3fb950',
            style.getPropertyValue('--chart-color-3').trim() || '#d29922',
            style.getPropertyValue('--chart-color-4').trim() || '#f85149',
            style.getPropertyValue('--chart-color-5').trim() || '#a371f7',
            style.getPropertyValue('--chart-color-6').trim() || '#db61a2',
            style.getPropertyValue('--chart-color-7').trim() || '#79c0ff',
            style.getPropertyValue('--chart-color-8').trim() || '#7ee787',
            style.getPropertyValue('--chart-color-9').trim() || '#e3b341',
            style.getPropertyValue('--chart-color-10').trim() || '#ff7b72'
        ];
    }

    /**
     * Gets theme-aware text colors from CSS
     * @returns {Object} Object with text colors
     */
    getTextColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            primary: style.getPropertyValue('--color-text-primary').trim() || '#f0f6fc',
            secondary: style.getPropertyValue('--color-text-secondary').trim() || '#8b949e',
            border: style.getPropertyValue('--color-border').trim() || '#30363d',
            bgGlass: style.getPropertyValue('--color-bg-glass').trim() || 'rgba(22, 27, 34, 0.95)'
        };
    }

    /**
     * Creates the leaderboard bar chart
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {Array} data - User statistics data
     * @param {string} metric - Current metric label
     * @param {Function} onBarClick - Callback when a bar is clicked
     */
    createLeaderboardChart(canvas, data, metric = 'Commits', onBarClick = null) {
        const ctx = canvas.getContext('2d');

        // Destroy existing chart if any
        if (this.leaderboardChart) {
            this.leaderboardChart.destroy();
        }

        const topUsers = data.slice(0, 20);
        const chartColors = this.getChartColors();
        const textColors = this.getTextColors();

        this.leaderboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topUsers.map(u => u.username),
                datasets: [{
                    label: metric,
                    data: topUsers.map(u => u.value),
                    backgroundColor: topUsers.map((_, i) => this.getGradient(ctx, i, chartColors)),
                    borderColor: topUsers.map((_, i) => chartColors[i % chartColors.length]),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0 && onBarClick) {
                        const index = elements[0].index;
                        const username = topUsers[index].username;
                        onBarClick(username);
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: textColors.bgGlass,
                        titleColor: textColors.primary,
                        bodyColor: textColors.secondary,
                        borderColor: textColors.border,
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => items[0].label,
                            label: (item) => `${metric}: ${item.raw.toLocaleString()}`,
                            afterLabel: () => 'Click to exclude'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: textColors.border + '80',
                            drawBorder: false
                        },
                        ticks: {
                            color: textColors.secondary
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColors.primary,
                            font: {
                                weight: '500'
                            }
                        }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutQuart'
                }
            }
        });

        // Make canvas cursor pointer to indicate clickability
        canvas.style.cursor = 'pointer';
    }

    /**
     * Creates the trend line chart
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {Object} trendData - Trend data with labels and datasets
     */
    createTrendChart(canvas, trendData) {
        const ctx = canvas.getContext('2d');

        // Destroy existing chart if any
        if (this.trendChart) {
            this.trendChart.destroy();
        }

        if (!trendData) {
            // Show placeholder message
            this.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Select a specific year to view trends'],
                    datasets: [{
                        data: [0],
                        borderColor: 'transparent'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    }
                }
            });
            return;
        }

        const textColors = this.getTextColors();


        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: trendData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColors.primary,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: textColors.bgGlass,
                        titleColor: textColors.primary,
                        bodyColor: textColors.secondary,
                        borderColor: textColors.border,
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: textColors.border + '80',
                            drawBorder: false
                        },
                        ticks: {
                            color: textColors.secondary
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: textColors.border + '80',
                            drawBorder: false
                        },
                        ticks: {
                            color: textColors.secondary
                        }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    /**
     * Updates the leaderboard chart with new data
     * @param {Array} data - User statistics data
     * @param {string} metric - Current metric label
     */
    updateLeaderboardChart(data, metric = 'Commits') {
        if (!this.leaderboardChart) return;

        const topUsers = data.slice(0, 20);
        const ctx = this.leaderboardChart.ctx;

        this.leaderboardChart.data.labels = topUsers.map(u => u.username);
        this.leaderboardChart.data.datasets[0].label = metric;
        this.leaderboardChart.data.datasets[0].data = topUsers.map(u => u.value);
        this.leaderboardChart.data.datasets[0].backgroundColor = topUsers.map((_, i) => this.getGradient(ctx, i));
        this.leaderboardChart.data.datasets[0].borderColor = topUsers.map((_, i) => this.chartColors[i % this.chartColors.length]);

        this.leaderboardChart.update('active');
    }

    /**
     * Updates the trend chart with new data
     * @param {Object} trendData - Trend data with labels and datasets
     */
    updateTrendChart(trendData) {
        const canvas = this.trendChart?.canvas;
        if (canvas) {
            this.createTrendChart(canvas, trendData);
        }
    }

    /**
     * Creates a gradient for bar backgrounds
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} index - Color index
     * @param {Array<string>} chartColors - Array of chart colors
     * @private
     */
    getGradient(ctx, index, chartColors = this.getChartColors()) {
        const color = chartColors[index % chartColors.length];
        const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
        gradient.addColorStop(0, color + '80');
        gradient.addColorStop(1, color + '20');
        return gradient;
    }

    /**
     * Destroys all charts
     */
    destroy() {
        if (this.leaderboardChart) {
            this.leaderboardChart.destroy();
            this.leaderboardChart = null;
        }
        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }
    }
}

// Export for use in other scripts
window.ChartManager = ChartManager;

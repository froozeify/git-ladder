# Git Ladder

🏆 **A GitHub Pages website displaying commits and pull requests Hall of Fame.**

## Features

- 📊 **Interactive Charts**: Beautiful bar charts showing user rankings and line charts for monthly trends
- 🎯 **Flexible Filtering**: Filter by year, month, and metric type (commits or pull requests)
- 🌙 **Dark Theme**: Modern glassmorphism design with smooth animations
- 🔄 **Auto-Updated**: Data is fetched daily via GitHub Actions
- 📱 **Responsive**: Works great on desktop, tablet, and mobile

## Getting Started

Configure which GitHub organizations to track using the `GH_ORGS` repository variable. See [Configuration](#configuration) for details.

## Quick Start

### View the Website

Visit the GitHub Pages deployment: `https://froozeify.github.io/git-ladder/`

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/froozeify/git-ladder.git
   cd git-ladder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Serve locally:
   ```bash
   npm run serve
   ```

4. Open `http://localhost:3000` in your browser

### Fetch Fresh Data

To manually fetch the latest data from GitHub:

1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. Run the fetch script:
   ```bash
   npm run fetch-data
   ```

The script automatically loads configuration from `.env`.

## Project Structure

```
git-ladder/
├── .github/workflows/
│   └── fetch-and-deploy.yml # Deployment workflow (Push & Schedule)
├── data/
│   └── stats.json          # Generated statistics (not committed)
├── scripts/
│   └── fetch-stats.js      # Data fetching script (auto-loads .env)
├── src/
│   ├── css/
│   │   └── style.css       # Styling
│   └── js/
│       ├── DataService.js  # Data loading/processing
│       ├── ChartManager.js # Chart.js wrapper
│       └── App.js          # Main application
├── index.html              # Main page
├── .env.example            # Example configuration
└── package.json
```

## Configuration

### GitHub Setup (Required)

Follow these steps to configure your repository:

#### 1. Enable GitHub Pages

1. Go to your repository's **Settings** → **Pages**
2. Under "Build and deployment", set **Source** to **GitHub Actions**

#### 2. Configure Organizations to Track

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click the **Variables** tab
3. Click **New repository variable**
4. Add:
   - **Name**: `GH_ORGS`
   - **Value**: Comma-separated list of organizations (e.g., `glpi-project,glpi-network`)

#### 3. Configure Data Range (Optional)

1. Click **New repository variable**
2. Add:
   - **Name**: `GH_YEARS`
   - **Value**: Number of years to fetch (default: `3`)

#### 4. (Optional) Private Repositories

For tracking private repositories:

1. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click the **Secrets** tab → **New repository secret**
4. Add:
   - **Name**: `GH_PAT`
   - **Value**: Your personal access token

> **Note**: Secret and variable names cannot start with `GITHUB_`, which is why we use `GH_` prefix.

### Local Development

For local data fetching:

```bash
# Create and configure .env file
cp .env.example .env
# Edit .env with your GH_ORGS, GH_YEARS, and GH_TOKEN

# Run the fetch script
npm run fetch-data
```

## Technology Stack

- **HTML5 / CSS3 / JavaScript (ES6+)**: No build step required
- **Chart.js**: Beautiful, responsive charts
- **GitHub Actions**: Automated data fetching and deployment
- **GitHub Pages**: Free static hosting (artifact-based deployment)
- **Octokit**: Official GitHub API client

## How It Works

The deployment uses GitHub's artifact-based Pages deployment:

1. **Daily Trigger**: GitHub Actions runs the workflow at 6:00 UTC daily
2. **Data Fetch**: The script fetches commits/PRs from configured organizations
3. **Build Artifact**: The entire site (including generated data) is packaged
4. **Deploy**: The artifact is deployed directly to GitHub Pages

This approach means:
- ✅ No data files committed to the repository
- ✅ Fresh data on every deployment
- ✅ Clean git history

### Important: Scheduled Workflow Reliability

GitHub may disable scheduled workflows after **60 days of repository inactivity**. If the daily data refresh stops working:

1. **Check if the workflow is disabled**: Go to **Actions** → Click the workflow → Look for a yellow banner indicating it's disabled
2. **Re-enable if needed**: Click "Enable workflow" button
3. **Ensure repository activity**: Any push, issue, or PR activity resets the 60-day counter

You can also manually trigger the workflow anytime via **Actions** → **Fetch Data and Deploy to Pages** → **Run workflow**.

For more details, see [GitHub's documentation on disabling workflows](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow).

## Contributing

1. Fork the repository
2. Create branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Chart.js](https://www.chartjs.org/) for the visualization library
- [Inter Font](https://fonts.google.com/specimen/Inter) for the typography

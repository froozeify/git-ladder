# AGENTS.md - AI Agent Guidelines

This document provides guidance for AI agents working on the Git Ladder codebase.

## Project Overview

Git Ladder is a static website that displays contribution leaderboards (commits and pull requests) for GitHub organizations. It's designed to be hosted on GitHub Pages with data fetched via GitHub Actions.

## Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | Vanilla HTML/CSS/JS | No build step, ES6+ syntax |
| Charts | Chart.js 4.x | Loaded via CDN |
| Data Fetching | Node.js + Octokit | Runs in GitHub Actions |
| Hosting | GitHub Pages | Static files only |
| CI/CD | GitHub Actions | Daily data updates |

## Project Structure

```
git-ladder/
├── .github/workflows/
│   └── fetch-and-deploy.yml # Fetch data and deploy to Pages (daily)
├── data/
│   └── stats.json          # Generated statistics (NOT committed, generated at deploy time)
├── scripts/
│   └── fetch-stats.js      # Node.js script for fetching data (auto-loads .env)
├── src/
│   ├── css/
│   │   └── style.css       # All styling (CSS custom properties)
│   └── js/
│       ├── DataService.js  # Data loading and filtering
│       ├── ChartManager.js # Chart.js wrapper
│       └── App.js          # Main controller
├── index.html              # Single page application
├── package.json            # Node.js dependencies
├── .env.example            # Example configuration for local dev
├── AGENTS.md               # This file
├── FUTURE_IDEAS.md         # Planned enhancements
└── README.md               # User documentation
```

## Deployment Architecture

The project uses GitHub's artifact-based Pages deployment:

1. Data is fetched during the workflow run (not committed)
2. The entire site + generated data is packaged as an artifact
3. The artifact is deployed directly to GitHub Pages

This keeps the repository clean while ensuring fresh data on every deployment.

## Key Patterns

### JavaScript Classes

The application uses ES6 classes with clear separation of concerns:

1. **DataService**: Handles data loading and filtering
   - `loadData()`: Fetches stats.json
   - `getUserStats(filters)`: Returns filtered/sorted user data
   - `getTrendData(options)`: Returns trend chart data

2. **ChartManager**: Wraps Chart.js functionality
   - `createLeaderboardChart()`: Bar chart for rankings
   - `createTrendChart()`: Line chart for monthly trends

3. **App**: Main controller
   - Initializes services
   - Binds event handlers
   - Coordinates rendering

### CSS Architecture

- Uses CSS custom properties (`:root`) for theming
- BEM-like naming convention
- Glassmorphism effects with `backdrop-filter`
- Mobile-first responsive design

### Data Format

The `stats.json` structure:

```json
{
  "lastUpdated": "ISO8601 timestamp",
  "organizations": ["org1", "org2"],
  "users": {
    "username": {
      "avatar": "URL",
      "commits": {
        "2026": { "total": 100, "months": { "01": 10, ... } }
      },
      "pullRequests": {
        "2026": { "total": 50, "months": { "01": 5, ... } }
      }
    }
  }
}
```

## Common Tasks

### Configuring Organizations

Organizations are configured via the `GH_ORGS` environment variable:

**For GitHub Actions:**
1. Go to repository **Settings** > **Secrets and variables** > **Actions** > **Variables**
2. Create `GH_ORGS` variable with comma-separated organizations
3. Create `GH_YEARS` variable with number of years (optional, default: 3)

**For Local Development:**
```bash
# Create .env file from example
cp .env.example .env
# Edit .env with your configuration

# Run fetch (automatically loads .env)
npm run fetch-data
```

The fetch script uses `dotenv` to automatically load configuration from `.env`.
The frontend automatically reads organizations from the generated `stats.json` file.

### Adding a New Metric

1. Update `scripts/fetch-stats.js` to fetch the metric
2. Update `DataService.js` to handle the new metric
3. Add toggle button in `index.html`
4. Update `App.js` to handle the new metric filter

### Modifying Chart Appearance

All chart configuration is in `ChartManager.js`. Colors are defined in:
- `chartColors` array in ChartManager
- CSS custom properties (`--chart-color-*`)

### Changing Theme

All theming is controlled by CSS custom properties in `style.css`:
```css
:root {
    --color-bg-primary: #0d1117;
    --color-accent-primary: #58a6ff;
    /* ... etc */
}
```

## Testing

### Local Testing

1. Run `npm run serve` to start local server
2. Open browser to `http://localhost:3000`
3. Test with sample data in `data/stats.json`

### Testing Data Fetching

```bash
GH_YEARS=2 GH_ORGS="org1,org2" GH_TOKEN=your_token npm run fetch-data
```

## Development Guidelines

### Commit Messages

Commits should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

## Security Considerations

- Never commit GitHub tokens
- The default `GITHUB_TOKEN` in Actions only works for public repos
- For private repos, use a PAT stored as `GH_PAT` secret

## Performance Notes

- Data is loaded once on page load
- Charts are recreated (not updated) for simplicity
- Consider implementing lazy loading for user avatars if list grows large
- The fetch script limits to 1000 commits/PRs per repo to avoid timeouts

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support (no transpilation)
- `backdrop-filter` may not work in older browsers (graceful degradation)


## License

GNU AGPLv3 License – See [LICENSE](LICENSE) file for details.

---

**Created by:** Benoît VIGNAL
**Version:** 1.0.0
**Last Updated:** 2026-01-21

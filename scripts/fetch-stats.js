/**
 * GitHub Statistics Fetcher
 * 
 * Fetches commits and pull requests from specified GitHub organizations
 * and aggregates statistics by user, month, and year.
 */

import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// ANSI colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m'; // No Color

// Configuration
// Organizations can be set via GH_ORGS environment variable (comma-separated)
// Example: GH_ORGS="org1,org2,org3"
const ORGANIZATIONS = (process.env.GH_ORGS || process.env.GITHUB_ORGS || '')
  .split(',').map(org => org.trim()).filter(Boolean);

if (ORGANIZATIONS.length === 0) {
  console.error(`${RED}Error: No organizations specified.${NC}`);
  console.error('');
  console.error('Set the GH_ORGS environment variable with comma-separated organization names.');
  console.error('Example: GH_ORGS="glpi-project,glpi-network"');
  console.error('');
  console.error('Or create a .env file (copy from .env.example):');
  console.error('  cp .env.example .env');
  process.exit(1);
}

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error(`${RED}Error: No GitHub token specified.${NC}`);
  console.error('');
  console.error('Set the GH_TOKEN environment variable with your GitHub token.');
  console.error('Create one at: https://github.com/settings/tokens');
  console.error('');
  console.error('Or add it to your .env file:');
  console.error('  GH_TOKEN=your_token_here');
  process.exit(1);
}

// Years to fetch
const YEARS_TO_FETCH = parseInt(process.env.GH_YEARS || '5', 10);

if (isNaN(YEARS_TO_FETCH) || YEARS_TO_FETCH < 1) {
    console.error(`${RED}Error: GH_YEARS must be a positive integer.${NC}`);
    process.exit(1);
}

console.log(`${GREEN}Configuration:${NC}`);
console.log(`  Organizations: ${ORGANIZATIONS.join(', ')}`);
console.log(`  Years to fetch: ${YEARS_TO_FETCH}`);
console.log(`  Token: ***${token.slice(-4)}`);
console.log('');

const OUTPUT_FILE = 'data/stats.json';

// Initialize Octokit with authentication
const octokit = new Octokit({ auth: token });

/**
 * Fetches all repositories for an organization
 * @param {string} org - Organization name
 * @returns {Promise<Array>} List of repositories
 */
async function fetchRepositories(org) {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org,
      type: 'all',
      per_page: 100
    });
    
    console.log(`Found ${repos.length} repositories in ${org}`);
    return repos;
  } catch (error) {
    console.error(`Error fetching repos for ${org}:`, error.message);
    return [];
  }
}

/**
 * Fetches commits for a repository within the configured year range
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of commits
 */
async function fetchCommits(owner, repo) {
  const since = new Date();
  since.setFullYear(since.getFullYear() - YEARS_TO_FETCH);
  
  try {
    const commits = await octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo,
      since: since.toISOString(),
      per_page: 100
    }, (response, done) => {
      const filtered = response.data.filter(c => new Date(c.commit.author.date) >= since);
      // If we've gone past our date range, stop paginating
      if (filtered.length < response.data.length) {
        done();
      }
      return filtered;
    });
    
    return commits;
  } catch (error) {
    // 409 means empty repository
    if (error.status !== 409) {
      console.error(`Error fetching commits for ${owner}/${repo}:`, error.message);
    }
    return [];
  }
}

/**
 * Fetches pull requests for a repository within the configured year range
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of pull requests
 */
async function fetchPullRequests(owner, repo) {
  const since = new Date();
  since.setFullYear(since.getFullYear() - YEARS_TO_FETCH);
  
  try {
    const pullRequests = await octokit.paginate(octokit.pulls.list, {
      owner,
      repo,
      state: 'all',
      sort: 'created',
      direction: 'desc',
      per_page: 100
    }, (response, done) => {
      const filtered = response.data.filter(pr => new Date(pr.created_at) >= since);
      // If we've gone past our date range, stop paginating
      if (filtered.length < response.data.length) {
        done();
      }
      return filtered;
    });
    
    return pullRequests;
  } catch (error) {
    console.error(`Error fetching PRs for ${owner}/${repo}:`, error.message);
    return [];
  }
}

/**
 * Fetches code reviews for a list of pull requests with pagination
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Array} pullRequests - List of pull requests to fetch reviews for
 * @returns {Promise<Array>} List of reviews (excluding self-reviews)
 */
async function fetchReviews(owner, repo, pullRequests) {
  const reviews = [];

  for (const pr of pullRequests) {
    try {
      const prReviews = await octokit.paginate(octokit.pulls.listReviews, {
        owner,
        repo,
        pull_number: pr.number,
        per_page: 100
      });

      for (const review of prReviews) {
        // Skip self-reviews and reviews without a user
        if (!review.user || review.user.login === pr.user?.login) continue;
        // Skip pending reviews that haven't been submitted yet
        if (review.state === 'PENDING') continue;

        reviews.push({
          user: review.user,
          submitted_at: review.submitted_at
        });
      }
    } catch (error) {
      console.error(`Error fetching reviews for ${owner}/${repo}#${pr.number}:`, error.message);
    }
  }

  return reviews;
}

/**
 * Aggregates statistics by user
 * @param {Map} users - Map of user statistics
 * @param {Array} commits - List of commits
 * @param {Array} pullRequests - List of pull requests
 * @param {Array} codeReviews - List of code reviews
 */
function aggregateStats(users, commits, pullRequests, codeReviews) {
  // Process commits
  for (const commit of commits) {
    if (!commit.author) continue;
    
    const login = commit.author.login;
    const avatar = commit.author.avatar_url;
    const date = new Date(commit.commit.author.date);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    if (!users.has(login)) {
      users.set(login, {
        avatar,
        commits: {},
        pullRequests: {},
        codeReviews: {}
      });
    }
    
    const user = users.get(login);
    
    // Initialize year if needed
    if (!user.commits[year]) {
      user.commits[year] = { total: 0, months: {} };
    }
    if (!user.commits[year].months[month]) {
      user.commits[year].months[month] = 0;
    }
    
    user.commits[year].total++;
    user.commits[year].months[month]++;
  }
  
  // Process pull requests
  for (const pr of pullRequests) {
    if (!pr.user) continue;
    
    const login = pr.user.login;
    const avatar = pr.user.avatar_url;
    const date = new Date(pr.created_at);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    if (!users.has(login)) {
      users.set(login, {
        avatar,
        commits: {},
        pullRequests: {},
        codeReviews: {}
      });
    }
    
    const user = users.get(login);
    
    // Initialize year if needed
    if (!user.pullRequests[year]) {
      user.pullRequests[year] = { total: 0, months: {} };
    }
    if (!user.pullRequests[year].months[month]) {
      user.pullRequests[year].months[month] = 0;
    }
    
    user.pullRequests[year].total++;
    user.pullRequests[year].months[month]++;
  }

  // Process code reviews
  for (const review of codeReviews) {
    if (!review.user) continue;

    const login = review.user.login;
    const avatar = review.user.avatar_url;
    const date = new Date(review.submitted_at);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    if (!users.has(login)) {
      users.set(login, {
        avatar,
        commits: {},
        pullRequests: {},
        codeReviews: {}
      });
    }

    const user = users.get(login);

    // Ensure codeReviews object exists (for users created by commits/PRs processing)
    if (!user.codeReviews) {
      user.codeReviews = {};
    }

    // Initialize year if needed
    if (!user.codeReviews[year]) {
      user.codeReviews[year] = { total: 0, months: {} };
    }
    if (!user.codeReviews[year].months[month]) {
      user.codeReviews[year].months[month] = 0;
    }

    user.codeReviews[year].total++;
    user.codeReviews[year].months[month]++;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('Starting GitHub statistics fetch...');
  console.log(`Organizations: ${ORGANIZATIONS.join(', ')}`);
  
  const users = new Map();
  
  for (const org of ORGANIZATIONS) {
    console.log(`\nProcessing organization: ${org}`);
    
    const repos = await fetchRepositories(org);
    
    for (const repo of repos) {
      const displayName = repo.private
        ? '*'.repeat(Math.floor(Math.random() * 6) + 5) // Random length 5-10
        : repo.name;
      console.log(`  Processing ${displayName}...`);
      
      const [commits, pullRequests] = await Promise.all([
        fetchCommits(org, repo.name),
        fetchPullRequests(org, repo.name)
      ]);

      const codeReviews = await fetchReviews(org, repo.name, pullRequests);
      
      console.log(`    Found ${commits.length} commits, ${pullRequests.length} PRs, ${codeReviews.length} reviews`);
      
      aggregateStats(users, commits, pullRequests, codeReviews);
    }
  }
  
  // Convert Map to object for JSON serialization
  const usersObject = {};
  for (const [login, data] of users) {
    usersObject[login] = data;
  }
  
  // Build output
  const output = {
    lastUpdated: new Date().toISOString(),
    organizations: ORGANIZATIONS,
    users: usersObject
  };
  
  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_FILE);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  
  console.log(`\nStatistics saved to ${OUTPUT_FILE}`);
  console.log(`Total users: ${users.size}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

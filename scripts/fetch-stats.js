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
const YEARS_TO_FETCH = parseInt(process.env.GH_YEARS || '3', 10);

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
  const repos = [];
  let page = 1;
  
  while (true) {
    try {
      const { data } = await octokit.repos.listForOrg({
        org,
        type: 'public',
        per_page: 100,
        page
      });
      
      if (data.length === 0) break;
      repos.push(...data);
      page++;
    } catch (error) {
      console.error(`Error fetching repos for ${org}:`, error.message);
      break;
    }
  }
  
  console.log(`Found ${repos.length} repositories in ${org}`);
  return repos;
}

/**
 * Fetches commits for a repository within the configured year range
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of commits
 */
async function fetchCommits(owner, repo) {
  const commits = [];
  const since = new Date();
  since.setFullYear(since.getFullYear() - YEARS_TO_FETCH);
  
  let page = 1;
  
  while (true) {
    try {
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        since: since.toISOString(),
        per_page: 100,
        page
      });
      
      if (data.length === 0) break;
      commits.push(...data);
      page++;
      
      // Rate limiting protection
      if (page > 10) break; // Max 1000 commits per repo
    } catch (error) {
      // 409 means empty repository
      if (error.status !== 409) {
        console.error(`Error fetching commits for ${owner}/${repo}:`, error.message);
      }
      break;
    }
  }
  
  return commits;
}

/**
 * Fetches pull requests for a repository within the configured year range
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of pull requests
 */
async function fetchPullRequests(owner, repo) {
  const pullRequests = [];
  const since = new Date();
  since.setFullYear(since.getFullYear() - YEARS_TO_FETCH);
  
  let page = 1;
  
  while (true) {
    try {
      const { data } = await octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        sort: 'created',
        direction: 'desc',
        per_page: 100,
        page
      });
      
      if (data.length === 0) break;
      
      // Filter by date
      const filtered = data.filter(pr => new Date(pr.created_at) >= since);
      pullRequests.push(...filtered);
      
      // If we've gone past our date range, stop
      if (filtered.length < data.length) break;
      
      page++;
      if (page > 10) break; // Max 1000 PRs per repo
    } catch (error) {
      console.error(`Error fetching PRs for ${owner}/${repo}:`, error.message);
      break;
    }
  }
  
  return pullRequests;
}

/**
 * Aggregates statistics by user
 * @param {Map} users - Map of user statistics
 * @param {Array} commits - List of commits
 * @param {Array} pullRequests - List of pull requests
 */
function aggregateStats(users, commits, pullRequests) {
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
        pullRequests: {}
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
        pullRequests: {}
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
      console.log(`  Processing ${repo.name}...`);
      
      const [commits, pullRequests] = await Promise.all([
        fetchCommits(org, repo.name),
        fetchPullRequests(org, repo.name)
      ]);
      
      console.log(`    Found ${commits.length} commits, ${pullRequests.length} PRs`);
      
      aggregateStats(users, commits, pullRequests);
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

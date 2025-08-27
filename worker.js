/**
 * Smart Router for officeadmin.io with Origin Header Fix
 * - Serves GitHub Pages content at root (/) without URL changes
 * - Passes all other requests to Railway n8n instance
 * - Fixes Origin header for WebSocket connections and CORS
 * - Auto-deployed from GitHub
 */

const GITHUB_PAGES_URL = 'https://banddude.github.io/officeadmin';
const RAILWAY_URL = 'https://primary-production-3d94.up.railway.app';

// GitHub Pages paths - these should be served from GitHub Pages instead of n8n
const GITHUB_PAGES_PATHS = [
  '/',
  '/blog',
  '/hello',
  '/ReportKit'
];

// Protected n8n paths - these should NEVER be served from GitHub Pages
const PROTECTED_N8N_PATHS = [
  '/signin',
  '/workflows',
  '/executions', 
  '/credentials',
  '/settings',
  '/webhook',
  '/api',
  '/home',
  '/rest',
  '/assets',
  '/static'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Check if this path should be served from GitHub Pages (case-insensitive)
    const isGitHubPagesPath = GITHUB_PAGES_PATHS.some(path => {
      if (path === '/') {
        return url.pathname === '/' || url.pathname === '';
      }
      return url.pathname.toLowerCase() === path.toLowerCase() || url.pathname.toLowerCase().startsWith(path.toLowerCase() + '/');
    });
    
    // Serve from GitHub Pages if it's a designated path
    if (isGitHubPagesPath) {
      try {
        // Construct GitHub Pages URL with the path
        let githubUrl;
        if (url.pathname === '/' || url.pathname === '') {
          githubUrl = GITHUB_PAGES_URL;
        } else {
          // Find the matching case-sensitive path from GITHUB_PAGES_PATHS
          const matchingPath = GITHUB_PAGES_PATHS.find(path => 
            path.toLowerCase() === url.pathname.toLowerCase() ||
            url.pathname.toLowerCase().startsWith(path.toLowerCase() + '/')
          );
          
          if (matchingPath && matchingPath !== '/') {
            // Use the correct case from GITHUB_PAGES_PATHS for GitHub Pages URL
            const remainingPath = url.pathname.toLowerCase().startsWith(matchingPath.toLowerCase() + '/') 
              ? url.pathname.slice(matchingPath.length)
              : '';
            githubUrl = `${GITHUB_PAGES_URL}${matchingPath}${remainingPath}/index.html`;
          } else {
            // Fallback to original path
            githubUrl = `${GITHUB_PAGES_URL}${url.pathname}/index.html`;
          }
        }
        
        const githubResponse = await fetch(githubUrl);
        
        if (githubResponse.ok) {
          // Get the HTML content
          let content = await githubResponse.text();
          
          // Return the content as if it came from officeadmin.io
          return new Response(content, {
            headers: {
              'Content-Type': 'text/html;charset=UTF-8',
              'Cache-Control': 'public, max-age=300'
            }
          });
        }
      } catch (error) {
        console.error('Error fetching GitHub Pages:', error);
      }
    }
    
    // For all other paths, proxy to Railway n8n instance
    const railwayUrl = new URL(request.url);
    railwayUrl.hostname = new URL(RAILWAY_URL).hostname;
    railwayUrl.protocol = 'https:';
    
    // Create headers and fix the Origin header for n8n
    const headers = new Headers(request.headers);
    
    // Fix Origin header - n8n expects requests to come from its own domain
    if (headers.get('Origin') === 'https://officeadmin.io' || headers.get('Origin') === 'officeadmin.io') {
      headers.set('Origin', RAILWAY_URL);
    }
    
    // Fix Referer header if present
    const referer = headers.get('Referer');
    if (referer && referer.includes('officeadmin.io')) {
      headers.set('Referer', referer.replace('officeadmin.io', new URL(RAILWAY_URL).hostname));
    }
    
    // Fix Host header to match the Railway instance
    headers.set('Host', new URL(RAILWAY_URL).hostname);
    
    // Handle WebSocket upgrade requests
    const upgradeHeader = headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      // For WebSocket connections, create a proper WebSocket request
      return fetch(railwayUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
      });
    }
    
    // Create new request to Railway with corrected headers
    const railwayRequest = new Request(railwayUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'manual'
    });
    
    // Forward to Railway and return response
    const response = await fetch(railwayRequest);
    
    // Create a new response with the same body and headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    return newResponse;
  }
};
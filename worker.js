/**
 * Smart Router for officeadmin.io with Case-Insensitive Routing
 * - Serves GitHub Pages content for specified paths (case-insensitive)
 * - Passes all other requests to Railway n8n instance
 * - Fixes Origin header for WebSocket connections and CORS
 */

const GITHUB_PAGES_URL = 'https://banddude.github.io/officeadmin';
const RAILWAY_URL = 'https://primary-production-3d94.up.railway.app';

const GITHUB_PAGES_PATHS = [
  '/',
  '/blog',
  '/hello',
  '/ReportKit'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Check if this path should be served from GitHub Pages (case-insensitive)
    const isGitHubPagesPath = GITHUB_PAGES_PATHS.some(path => {
      if (path === '/') {
        return url.pathname === '/' || url.pathname === '';
      }
      return url.pathname.toLowerCase() === path.toLowerCase() || 
             url.pathname.toLowerCase().startsWith(path.toLowerCase() + '/');
    });
    
    if (isGitHubPagesPath) {
      try {
        // Find matching path with correct case
        const matchingPath = GITHUB_PAGES_PATHS.find(path => 
          path.toLowerCase() === url.pathname.toLowerCase() ||
          url.pathname.toLowerCase().startsWith(path.toLowerCase() + '/')
        );
        
        let githubUrl;
        if (url.pathname === '/' || url.pathname === '') {
          githubUrl = GITHUB_PAGES_URL;
        } else if (matchingPath && matchingPath !== '/') {
          githubUrl = `${GITHUB_PAGES_URL}${matchingPath}/index.html`;
        } else {
          githubUrl = `${GITHUB_PAGES_URL}${url.pathname}/index.html`;
        }
        
        const githubResponse = await fetch(githubUrl);
        
        if (githubResponse.ok) {
          let content = await githubResponse.text();
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
    
    // Proxy to Railway n8n instance
    const railwayUrl = new URL(request.url);
    railwayUrl.hostname = new URL(RAILWAY_URL).hostname;
    railwayUrl.protocol = 'https:';
    
    const headers = new Headers(request.headers);
    
    if (headers.get('Origin') === 'https://officeadmin.io' || headers.get('Origin') === 'officeadmin.io') {
      headers.set('Origin', RAILWAY_URL);
    }
    
    const referer = headers.get('Referer');
    if (referer && referer.includes('officeadmin.io')) {
      headers.set('Referer', referer.replace('officeadmin.io', new URL(RAILWAY_URL).hostname));
    }
    
    headers.set('Host', new URL(RAILWAY_URL).hostname);
    
    const upgradeHeader = headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      return fetch(railwayUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
      });
    }
    
    const railwayRequest = new Request(railwayUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'manual'
    });
    
    const response = await fetch(railwayRequest);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
};
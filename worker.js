/**
 * Smart Router for officeadmin.io with Origin Header Fix
 * - Serves GitHub Pages content at root (/) without URL changes
 * - Passes all other requests to Railway n8n instance
 * - Fixes Origin header for WebSocket connections and CORS
 */

const GITHUB_PAGES_URL = 'https://banddude.github.io/officeadmin';
const RAILWAY_URL = 'https://primary-production-3d94.up.railway.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // If it's exactly the root path, serve GitHub Pages content
    if (url.pathname === '/' || url.pathname === '') {
      try {
        // Fetch content from GitHub Pages
        const githubResponse = await fetch(GITHUB_PAGES_URL);
        
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
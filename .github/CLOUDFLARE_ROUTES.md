# Auto Cloudflare Routes Management

This repository automatically manages Cloudflare Worker routes for GitHub Pages using GitHub Actions.

## How It Works

1. **Create a new page**: Add a directory with an `index.html` file (e.g., `/pricing/index.html`)
2. **Push to main**: The GitHub Action automatically triggers
3. **Route creation**: A new Cloudflare route is created: `officeadmin.io/pricing/*`
4. **Access your page**: Visit `https://officeadmin.io/pricing` - it works instantly!

## Protected Routes

These paths are **reserved for n8n** and cannot be used for GitHub Pages:

- `/signin` - n8n login
- `/workflows` - n8n workflows
- `/executions` - n8n execution history  
- `/credentials` - n8n credentials
- `/settings` - n8n settings
- `/webhook` - n8n webhooks
- `/api` - n8n API
- `/home` - n8n dashboard
- `/rest` - n8n REST API
- `/assets` - n8n assets
- `/static` - n8n static files

## Setup Required

Add these secrets to your GitHub repository:

1. `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
2. `CLOUDFLARE_ZONE_ID` - Your zone ID (found in Cloudflare dashboard)

## Examples

✅ **These work automatically:**
```
/blog/index.html        → officeadmin.io/blog/*
/pricing/index.html     → officeadmin.io/pricing/*
/about/index.html       → officeadmin.io/about/*
/help/faq/index.html    → officeadmin.io/help/faq/*
```

❌ **These will fail the build:**
```
/signin/index.html      → Conflicts with n8n login
/workflows/index.html   → Conflicts with n8n workflows
/api/index.html         → Conflicts with n8n API
```

## Manual Trigger

You can manually trigger the route management by going to:
`Actions → Auto-manage Cloudflare Routes → Run workflow`

## Architecture

- **main branch**: Landing page + GitHub Pages content
- **cloudflare branch**: Cloudflare Worker code (auto-deploys)
- **Routes**: Automatically managed by GitHub Actions

## Error Handling

If you try to create a page that conflicts with n8n routes, the build will fail with a clear error message explaining which route caused the conflict.
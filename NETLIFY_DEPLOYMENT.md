# Netlify Frontend Deployment Guide

This guide helps you deploy the frontend of the Cybersecurity Research App to Netlify.

## Prerequisites

Before deploying, make sure you have:
1. A deployed backend server (at a URL like `https://your-backend.onrender.com` or `https://your-project.railway.app`)
2. Netlify CLI installed and logged in

## Step 1: Install and Login to Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify (if not already logged in)
netlify login
```

## Step 2: Update netlify.toml with your backend URL

Before deployment, you must update the `netlify.toml` file in the root of this project with your actual backend URL:

```toml
[build]
  publish = "static"
  command = "echo 'Frontend build complete'"

[[redirects]]
  from = "/api/*"
  to = "https://YOUR_BACKEND_URL/api/:splat"  # Replace with your actual backend URL
  status = 200
  force = true

[[redirects]]
  from = "/static/*"
  to = "/static/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[dev]
  command = "cargo run"
  port = 8888
  targetPort = 3000
  framework = "#static"
```

Replace `https://YOUR_BACKEND_URL` with your actual backend server URL.

## Step 3: Deploy to Netlify

```bash
# Navigate to the project directory
cd /workspaces/vibe

# Deploy to a draft URL first (for testing)
netlify deploy --dir=static

# Or deploy directly to production (after confirming your setup works)
netlify deploy --dir=static --prod
```

## Step 4: Configure Environment Variables (if needed)

If you need to set any environment variables for the frontend (though this app doesn't require any for the frontend), you can do:

```bash
netlify env:set SOME_VARIABLE "value"
```

## Verification

After deployment:
1. Visit your Netlify site URL
2. The UI should load properly
3. When you submit a research topic, it will communicate with your backend server
4. You should see real-time progress and results streaming from your backend

## Troubleshooting

If API calls fail after deployment:
1. Check that you updated the backend URL in netlify.toml
2. Verify your backend server is running and accessible
3. Check browser console for CORS errors
4. Ensure your backend allows requests from your Netlify domain

## Updating the Site

To update your deployed site after making changes:

```bash
# Deploy to production
netlify deploy --dir=static --prod

# Or use the build command if set up
netlify build
```

## Links

- Netlify dashboard: https://app.netlify.com
- Netlify CLI documentation: https://cli.netlify.com
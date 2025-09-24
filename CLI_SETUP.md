# CLI Setup and Usage Guide

## Current Status

### Netlify CLI
- ✅ **Status**: Successfully logged in
- **User**: Prabhu Narayan (pnarayan1@gmail.com)
- **Team**: pnarayan1's team

### Neon CLI  
- ⚠️ **Status**: Installed but requires API key for headless usage
- **Version**: 2.15.0

## Authentication Setup

### Netlify Authentication
You're already logged into Netlify. Verify with:
```bash
netlify status
```

### Neon Authentication
Since we're in a headless environment (Codespaces), the Neon CLI requires an API key instead of browser-based authentication:

1. **Get your Neon API key**:
   - Go to https://console.neon.tech/app/settings/api-keys
   - Click "New API key"
   - Copy the generated API key

2. **Set the API key as an environment variable**:
```bash
export NEON_API_KEY="your-api-key-here"
```

3. **Or use the API key directly with commands**:
```bash
neonctl --api-key your-api-key-here projects list
```

4. **To make it permanent**, add to your shell profile:
```bash
echo 'export NEON_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

## Usage Examples

### Netlify CLI Usage
```bash
# Deploy your frontend
netlify deploy --dir=static

# Link to an existing project
netlify link

# Create a new project
netlify init

# View site information
netlify status
```

### Neon CLI Usage
```bash
# List your projects (after setting API key)
neonctl projects list

# Create a new project
neonctl projects create --project-name my-project

# List branches in a project
neonctl branches list --project-id your-project-id

# Get connection string for a branch
neonctl connection-string --project-id your-project-id --branch-name your-branch-name
```

## Integration with Your Application

### For Frontend Deployment (Netlify)
1. Your frontend files are in `/workspaces/vibe/static/`
2. Update the `netlify.toml` to redirect API calls to your backend:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-url/api/:splat"
  status = 200
  force = true
```

### For Database Management (Neon)
1. Create a Neon PostgreSQL database for production
2. Update your `DATABASE_URL` environment variable to use the Neon connection string
3. Run migrations: `DATABASE_URL=your-neon-url sqlx migrate run`

## Troubleshooting

### Netlify Issues
- If you get authentication errors: `netlify logout` then `netlify login`

### Neon Issues
- If you get authentication errors: Make sure your `NEON_API_KEY` environment variable is set correctly
- Check your API key permissions in the Neon console

## Security Notes
- Never commit API keys to version control
- Use environment variables for sensitive credentials
- Regularly rotate your API keys for security
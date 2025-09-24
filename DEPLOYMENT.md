# Deployment Guide for Cybersecurity Research App

## Architecture Overview
- Frontend: Static assets deployed on Netlify
- Backend: Rust server deployed on a platform that supports custom binaries (e.g., Railway, Heroku with a buildpack, or AWS/Azure)
- Database: Serverless Postgres (Neon or Supabase)
- LLM: OpenRouter API with alibaba/tongyi-deepresearch-30b-a3b model

## Frontend Deployment to Netlify

### 1. Prepare Frontend Assets
The frontend consists of static HTML, CSS, and JavaScript that can be served directly by Netlify.

### 2. Netlify Configuration
The `netlify.toml` file configures how Netlify serves the frontend:

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
```

## Backend Deployment Options

### Option 1: Railway (Recommended)
1. Create an account at https://railway.app
2. Install the Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Create a new project: `railway init`
5. Add the Rust backend:
   - Create a `Dockerfile` in the project root
   - Deploy using `railway up`

Dockerfile:
```dockerfile
FROM rust:1.70 as builder

WORKDIR /app

# Copy source code
COPY . .

# Build the application
RUN cargo build --release

FROM debian:buster-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/target/release/cybersecurity-research-app .

EXPOSE 3000

CMD ["./cybersecurity-research-app"]
```

### Option 2: Heroku (with Rust buildpack)
1. Create an account at https://heroku.com
2. Install the Heroku CLI
3. Create a new app: `heroku create your-app-name`
4. Add the Rust buildpack: `heroku buildpacks:set emk/rust`
5. Deploy: `git push heroku main`

### Option 3: Deploy to VPS
1. Build the Rust binary for your target server architecture
2. Transfer the binary to the server
3. Set up a process manager (systemd, PM2, etc.) to run the service
4. Set up a reverse proxy (nginx) to handle HTTPS and routing

## Database Setup: Neon Postgres

### 1. Create Neon Account
- Go to https://neon.tech
- Sign up for a free account

### 2. Create a Project
- Click "New Project"
- Choose your region
- Note down the connection string

### 3. Set Up Environment Variables
Create a `.env` file with:
```bash
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname
OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_MODEL=alibaba/tongyi-deepresearch-30b-a3b
RUST_LOG=info
```

### 4. Run Migrations
```bash
# Install SQLx CLI
cargo install sqlx-cli

# Run migrations
DATABASE_URL=your_neon_connection_string sqlx migrate run
```

## OpenRouter Integration with Alibaba Model

### 1. Configure OpenRouter API Key
1. Sign up at https://openrouter.ai
2. Obtain your API key from the dashboard
3. Set the `OPENROUTER_API_KEY` environment variable

### 2. Set Alibaba Model
The application is configured to use `alibaba/tongyi-deepresearch-30b-a3b` model for research tasks.
This can be changed in the `LLM_MODEL` environment variable.

## Environment Variables

Required environment variables:

- `DATABASE_URL`: Connection string for your Neon Postgres database
- `OPENROUTER_API_KEY`: API key for OpenRouter (required for research functionality)
- `LLM_MODEL`: The model to use (default: "alibaba/tongyi-deepresearch-30b-a3b")
- `RUST_LOG`: Log level (default: "info")

## Build and Run Commands

### Development
```bash
# Install dependencies
cargo build

# Set environment variables
export DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname
export OPENROUTER_API_KEY=your_api_key_here
export LLM_MODEL=alibaba/tongyi-deepresearch-30b-a3b

# Run migrations
sqlx migrate run

# Start the server
cargo run
```

### Production Build
```bash
# Build the release binary
cargo build --release
```

## Health Checks and Monitoring

The application exposes basic health check endpoints that can be used for monitoring:

- `/health` - Returns 200 OK if the application is running
- Database connectivity is checked at startup

## Security Considerations

- Never log sensitive information like API keys
- Use HTTPS for all connections
- Implement rate limiting for API endpoints
- Validate all input parameters
- Use prepared statements to prevent SQL injection

## Deployment Checklist

### Before Deploying Backend:
- [ ] Neon Postgres database created and connection string noted
- [ ] OpenRouter API key obtained
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Backend tested locally with OpenRouter API

### Before Deploying Frontend:
- [ ] Backend URL updated in netlify.toml redirect
- [ ] Frontend tested with backend API
- [ ] Netlify site configured with proper domain

### Post-Deployment:
- [ ] Verify API endpoints are accessible
- [ ] Test research functionality with real topic
- [ ] Confirm OpenRouter integration works
- [ ] Verify database connection
- [ ] Test citation verification
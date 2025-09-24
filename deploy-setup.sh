#!/bin/bash

# Deployment Setup Script for Cybersecurity Research App
# This script helps configure your environment for deployment

echo "================================================="
echo "Cybersecurity Research App - Deployment Setup"
echo "================================================="
echo ""

# Check if running in the correct directory
if [ ! -f "Cargo.toml" ]; then
    echo "Error: This script must be run from the project root directory."
    echo "Please navigate to the directory containing Cargo.toml"
    exit 1
fi

echo "This script will help you set up your deployment configuration"
echo ""

# Collect user inputs
echo "1. Database Configuration (Neon Postgres)"
echo "   Please create your Neon Postgres database at https://neon.tech"
read -p "   Enter your Neon Postgres connection string: " DB_URL

echo ""
echo "2. OpenRouter Configuration"
read -p "   Enter your OpenRouter API key: " OPENROUTER_KEY

echo ""
echo "3. Model Configuration"
echo "   Default model: alibaba/tongyi-deepresearch-30b-a3b"
read -p "   Enter your desired model (or press Enter to use default): " LLM_MODEL

if [ -z "$LLM_MODEL" ]; then
    LLM_MODEL="alibaba/tongyi-deepresearch-30b-a3b"
fi

echo ""
echo "Creating .env file with your configuration..."

# Create .env file with provided values
cat > .env << EOF
DATABASE_URL=$DB_URL
OPENROUTER_API_KEY=$OPENROUTER_KEY
LLM_MODEL=$LLM_MODEL
RUST_LOG=info
EOF

echo ""
echo "Environment file (.env) created successfully!"
echo ""

echo "4. Running Database Migrations"
echo "   Installing SQLx CLI if not already installed..."
cargo install sqlx-cli 2>/dev/null || echo "SQLx CLI already installed"

echo ""
echo "   Running migrations..."
sqlx migrate run || echo "Please run 'sqlx migrate run' after setting environment variables"

echo ""
echo "================================================="
echo "Setup Complete!"
echo "================================================="
echo ""
echo "Your application is configured with:"
echo "- Database: $DB_URL"
echo "- OpenRouter API: ✓ Configured"
echo "- LLM Model: $LLM_MODEL"
echo ""
echo "To start the application:"
echo "1. Make sure your .env file has the correct values"
echo "2. Run: cargo run"
echo ""
echo "For backend deployment (separate from frontend):"
echo "- Deploy the Rust backend to Railway, Heroku, or a VPS"
echo "- Frontend assets in 'static/' directory can be deployed to Netlify"
echo "- Update netlify.toml to point to your backend URL"
echo ""
echo "API endpoints:"
echo "- POST /api/submit - Submit research job"
echo "- GET /api/history - Get job history"
echo "- GET /api/jobs/{job_id}/stream - Stream results"
echo "================================================="
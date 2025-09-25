#!/bin/bash

# Quick Start Script for Netlify and Neon CLIs

echo "========================================="
echo "Netlify and Neon CLI Setup Information"
echo "========================================="

echo ""
echo "Netlify CLI Status:"
echo "-------------------"
netlify status 2>/dev/null || echo "Not logged in to Netlify (run: netlify login)"

echo ""
echo "Neon CLI Status:"
echo "----------------"
echo "Neon CLI is installed (version: $(neonctl --version 2>/dev/null || echo 'not available'))"
echo "To use Neon CLI, you need an API key from: https://console.neon.tech/app/settings/api-keys"
echo "Set it as: export NEON_API_KEY='your-api-key'"

echo ""
echo "Next Steps:"
echo "1. For Netlify: You're already logged in as $(netlify status 2>/dev/null | grep -o '[^ ]*@[^ ]*' | head -1)"
echo "2. For Neon: Get an API key and set the NEON_API_KEY environment variable"
echo "3. Update your application's DATABASE_URL to use your Neon database connection"
echo ""
echo "Example commands:"
echo "  - Deploy frontend: netlify deploy --dir=static"
echo "  - List Neon projects: neonctl --api-key YOUR_KEY projects list"
echo "  - Run database migrations: DATABASE_URL='your-neon-url' sqlx migrate run"

echo ""
echo "More information: See CLI_SETUP.md for detailed instructions"
echo "========================================="
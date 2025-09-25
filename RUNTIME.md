# Railway Deployment Configuration

## Environment Variables Required

To run this application on Railway, you need to set the following environment variables:

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string (automatically set when you add a PostgreSQL addon)
- `OPENROUTER_API_KEY` - Your OpenRouter API key for LLM access

### Optional Variables
- `LLM_MODEL` - Model to use for LLM calls (defaults to "alibaba/tongyi-deepresearch-30b-a3b")
- `PORT` - Port to run the application on (defaults to 8080)

## How to Deploy

1. Create a new project on Railway
2. Connect your GitHub repository or push directly
3. When prompted for build settings, Railway will automatically detect this as a Node.js application
4. Add a PostgreSQL database through the Railway dashboard (Addons tab → + New Addon → PostgreSQL)
5. Add your environment variables in the Variables tab:
   - Set `OPENROUTER_API_KEY` to your OpenRouter API key
6. The `DATABASE_URL` will be automatically set when you add the PostgreSQL addon
7. Deploy the application

## Database Configuration

The application automatically detects the database type based on the `DATABASE_URL`:
- If it starts with `postgres://` or `postgresql://`, it uses PostgreSQL
- If it starts with `sqlite://`, it uses SQLite (for local development)
- If no DATABASE_URL is provided, it defaults to a local SQLite file

The SSL configuration is automatically handled for Railway PostgreSQL deployments.

## Build Configuration

The application uses the following build configuration:
- Node.js application
- Starts with the command: `npm start`
- Dependencies are installed automatically from package.json
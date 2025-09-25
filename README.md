# Cybersecurity Research AI - Node.js Version

This is a Node.js version of the cybersecurity research application that was originally written in Rust. It provides an AI-powered platform for cybersecurity research and analysis with a ChatGPT-style interface.

## Features

- Modern web interface for cybersecurity research
- Real-time progress updates using Server-Sent Events (SSE)
- Job management system for tracking research tasks
- Support for both PostgreSQL and SQLite databases
- Responsive design with mobile support
- Export functionality for research results

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager
- Either PostgreSQL database or SQLite (fallback)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vibe
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
   - `DATABASE_URL`: Your PostgreSQL or SQLite connection string
   - `PORT`: Port to run the server on (default: 3000)

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The application will be accessible at `http://localhost:3000` (or the port specified in your environment).

## API Endpoints

- `GET /` - Main application interface
- `POST /api/submit` - Submit a new research job
- `GET /api/history` - Get job history
- `GET /api/jobs/:jobId/stream` - SSE stream for job updates
- `POST /api/jobs/:jobId/cancel` - Cancel a job
- `POST /api/jobs/:jobId/resume` - Resume a cancelled job
- `GET /api/jobs/:jobId/status` - Get job status
- `GET /api/jobs/:jobId/sections` - Get job sections
- `GET /api/jobs/:jobId/load` - Load complete job with content

## Database Support

The application supports both PostgreSQL and SQLite:

- For PostgreSQL: Set `DATABASE_URL=postgres://username:password@host:port/database`
- For SQLite: Set `DATABASE_URL=sqlite://path/to/database.db` (default is `sqlite://dev.db`)

## Architecture

- `server.js` - Main Express server with API routes
- `database.js` - Database abstraction layer supporting PostgreSQL and SQLite
- `job-manager.js` - Handles job processing and SSE events
- `/static` - Frontend assets (HTML, CSS, JavaScript)

## Environment Variables

- `DATABASE_URL` - Database connection string
- `PORT` - Port to run the server (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Frontend Interface

The application features a modern, responsive interface with:

- ChatGPT-style interface for research requests
- Real-time progress tracking
- Job history management
- Export capabilities
- Mobile support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cybersecurity Research App built with Rust (backend) and vanilla HTML/CSS/JavaScript (frontend). The application follows a Manager-Workers architecture where:

- **Manager** orchestrates research jobs and generates outlines
- **Workers** generate content for sections in parallel using OpenRouter API
- **Real-time streaming** via Server-Sent Events (SSE) to provide live progress updates
- **Database abstraction** supporting both SQLite (dev) and Postgres (production via Neon)

## Development Commands

### Core Development
- **Run the application**: `cargo run`
- **Build for production**: `cargo build --release`
- **Run tests**: `cargo test`
- **Format code**: `cargo fmt`
- **Lint code**: `cargo clippy`

### Database Operations
- **Install SQLx CLI**: `cargo install sqlx-cli`
- **Run migrations (SQLite)**: `DATABASE_URL=sqlite:dev.db sqlx migrate run`
- **Run migrations (Postgres)**: `DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname sqlx migrate run`

### Deployment
- **Build for Netlify**: `./build.sh` (builds Rust target for Netlify Functions)
- **Deploy frontend**: `netlify deploy --dir=static --prod`
- **Run verification**: `./verify_project.sh`

## Architecture Overview

### Backend Structure (`src/`)
- `main.rs` - Application entry point with Axum server setup
- `api.rs` - API route definitions and middleware
- `handlers.rs` - HTTP request handlers
- `manager.rs` - Research job orchestration and outline generation
- `workers.rs` - Parallel content generation with OpenRouter integration
- `db.rs` - Database abstraction layer (SQLite/Postgres)
- `models.rs` - Data structures and serialization
- `utils.rs` - Shared utilities and helper functions

### Frontend Structure (`static/`)
- `index.html` - Main application UI with ChatGPT-style layout
- `css/style.css` - Modern responsive styling with gradients
- `js/main.js` - Application logic with SSE handling
- `js/marked.min.js` - Markdown rendering library

### Key Features
- **Manager-Workers Pattern**: Jobs are broken into sections, processed in parallel
- **Real-time Progress**: SSE streams progress and content updates
- **Collapsible History**: Previous research jobs with search functionality
- **Worker Pinning**: Pin important worker progress to top of display
- **Mobile Responsive**: Professional UI optimized for all screen sizes

## Environment Configuration

Required environment variables:
- `DATABASE_URL` - Database connection (SQLite: `sqlite:dev.db`, Postgres: full connection string)
- `OPENROUTER_API_KEY` - API key for research content generation
- `LLM_MODEL` - Model to use (default: "alibaba/tongyi-deepresearch-30b-a3b")
- `RUST_LOG` - Logging level (default: "info")

Copy `.env.example` to `.env` and configure these values.

## API Endpoints

- `POST /api/submit` - Submit new research job with topic and depth
- `GET /api/history` - Retrieve previous research jobs
- `GET /api/jobs/{job_id}/stream` - SSE endpoint for real-time progress/content

## Database Schema

The application uses SQLx for type-safe database queries with migrations in `migrations/`. Key tables:
- Research jobs with status tracking
- Worker progress and content storage
- Citation and reference management

## Testing

- Unit tests: `tests/unit_tests.rs` - Core utility and model validation
- Integration tests: `tests/integration_tests.rs` - API endpoint testing

## Development Notes

- Uses Axum web framework with async/await throughout
- SSE channels stored in global HashMap (production would use Redis)
- OpenRouter integration for AI-powered research content generation
- Tracing for structured logging with configurable levels
- CORS enabled for frontend-backend communication during development
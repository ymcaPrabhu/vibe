# Cybersecurity Research App (Stage 1)

## Overview
This is a production-grade, Rust-first research application for cybersecurity topics with a Manager-Workers architecture, ChatGPT-style UI (collapsible history left, streaming content right), per-worker progress bars (pin-able), and stage-gated delivery with comprehensive testing at each stage.

### Key Features (Stage 1)
- Manager-Workers architecture for parallel research processing
- Real-time streaming of research output with progress tracking
- Collapsible history panel for previous research jobs
- Government of India writing style compliance
- Comprehensive citation verification system
- Support for both SQLite (dev) and serverless Postgres (production)
- OpenRouter integration with Alibaba Tongyi DeepResearch 30B model for research

## Architecture Summary (Stage 1)

### Backend Components
1. **Manager** - Orchestrates the research process, generates outlines, and coordinates workers
2. **Workers** - Generate content for individual sections in parallel with proper citations, using OpenRouter API
3. **Database Layer** - Abstracts between SQLite and Postgres for portability
4. **API Layer** - Handles job submission, history retrieval, and streaming
5. **SSE System** - Real-time progress and content streaming to frontend

### Frontend Components
1. **History Panel** - Shows previous research jobs with ability to collapse/expand
2. **Research Interface** - Form for submitting new research topics
3. **Progress Tracking** - Overall progress and per-worker progress bars
4. **Content Display** - Streaming results with markdown rendering
5. **Worker Pinning** - Ability to pin important worker progress to top

### Data Flow
1. User submits topic and depth via the frontend
2. Manager receives the job and generates a comprehensive outline
3. Workers are spawned for each section of the outline
4. Each worker calls OpenRouter API to generate research content and citations
5. Progress and content are streamed to the frontend in real-time via SSE
6. Final content is aggregated and displayed

## Setup Instructions

### Prerequisites
- Rust 1.70 or higher
- Access to OpenRouter API with valid API key
- SQLite (for development) or Neon Postgres (for production)

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd cyber-research-app
```

2. Install dependencies:
```bash
cargo build
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Neon Postgres URL and OpenRouter API key
```

4. Run database migrations:
```bash
# Install SQLx CLI
cargo install sqlx-cli

# For SQLite (dev)
DATABASE_URL=sqlite:dev.db sqlx migrate run

# For Neon Postgres (prod)
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname sqlx migrate run
```

5. Start the development server:
```bash
cargo run
```

The application will be available at `http://localhost:3000`

### Environment Variables
- `DATABASE_URL` - Database connection string (Neon Postgres recommended for production)
- `OPENROUTER_API_KEY` - API key for OpenRouter (required for research functionality)
- `LLM_MODEL` - Model to use (default: "alibaba/tongyi-deepresearch-30b-a3b")
- `RUST_LOG` - Log level (default: "info")

## API Endpoints

- `POST /api/submit` - Submit a new research job
- `GET /api/history` - Get research history
- `GET /api/jobs/{job_id}/stream` - Stream research progress and content

## Frontend Structure

The frontend is built with modern HTML5, CSS3, and vanilla JavaScript, with the following structure:

- `static/index.html` - Main application page with professional UI
- `static/css/style.css` - Modern, responsive styling with gradient effects
- `static/js/main.js` - Main application logic with enhanced UI interactions
- `static/js/marked.min.js` - Markdown parsing library

### Key Frontend Features:
- Professional, modern UI with gradient backgrounds and smooth animations
- Fully responsive design optimized for mobile, tablet, and desktop
- Interactive research controls with visual feedback
- Real-time progress tracking with animated progress bars
- Searchable research history
- Export functionality (PDF, Word, Markdown)
- Professional typography and iconography using Font Awesome
- Smooth transitions and animations for enhanced user experience

## Testing

Run the test suite:
```bash
cargo test
```

The application includes:
- Unit tests for core utilities
- Integration tests for API endpoints
- Validation tests for data structures

## Deployment

### Backend Setup
See the [DEPLOYMENT.md](./DEPLOYMENT.md) file for comprehensive backend deployment instructions with Neon Postgres and OpenRouter configuration.

### Frontend Deployment to Netlify
1. Follow the instructions in [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) to deploy the frontend to Netlify
2. First deploy your backend to a platform that supports Rust (Railway, Heroku, etc.)
3. Update the `netlify.toml` file with your backend server URL before deploying the frontend
4. Deploy the frontend using: `netlify deploy --dir=static --prod`

## Known Limitations (Stage 1)

1. Citation verification uses lightweight methods only (DOI/title lookups via public APIs)
2. No full-site crawling capabilities (planned for Stage 2)
3. Workers use OpenRouter API to generate content based on prompts rather than deep research
4. Limited to cybersecurity topics (though architecture is flexible for other domains)

## Planned for Stage 2

1. Real research with constrained, ethical retrieval
2. Robust provenance tracking
3. Complete citations covering every claim
4. Per-section artifacts index
5. Enhanced resilience with job resumption and cancellation

## Code Quality

- Rust code follows standard formatting (rustfmt)
- Linted with clippy for best practices
- Comprehensive test coverage
- Structured logging with tracing
- Type-safe SQL queries with sqlx

## License

[Specify your license here]
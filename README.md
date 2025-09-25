# Cybersecurity Research App (Stage 2)

## Overview
This is a production-grade, Rust-first research application for cybersecurity topics with a Manager-Workers architecture, ChatGPT-style UI (collapsible history left, streaming content right), per-worker progress bars (pin-able), and stage-gated delivery with comprehensive testing at each stage. Stage 2 has enhanced the platform with real research capabilities, robust provenance tracking, and enhanced resilience.

### Key Features (Stage 1 & 2)
- Manager-Workers architecture for parallel research processing
- Real-time streaming of research output with progress tracking
- Collapsible history panel for previous research jobs
- Government of India writing style compliance
- Comprehensive citation verification system with provenance tracking
- Support for both SQLite (dev) and serverless Postgres (production)
- Real research with constrained, ethical retrieval from trusted domains
- Per-section artifacts index with artifact storage and retrieval
- Enhanced resilience with job resumption and cancellation capabilities
- Complete citations covering every claim with verification and support levels

## Architecture Summary (Stage 2)

### Backend Components
1. **Manager** - Orchestrates the research process, generates outlines, and coordinates workers; now includes job cancellation and resumption capabilities
2. **Workers** - Generate content for individual sections in parallel with proper citations, using both OpenRouter API and direct research from trusted sources
3. **Artifacts Store** - Manages per-section artifacts with metadata and content
4. **Database Layer** - Abstracts between SQLite and Postgres for portability; now includes artifacts table
5. **API Layer** - Handles job submission, history retrieval, streaming, and job management (cancellation/resumption)
6. **SSE System** - Real-time progress and content streaming to frontend

### Frontend Components
1. **History Panel** - Shows previous research jobs with ability to collapse/expand
2. **Research Interface** - Form for submitting new research topics
3. **Progress Tracking** - Overall progress and per-worker progress bars
4. **Content Display** - Streaming results with markdown rendering
5. **Worker Pinning** - Ability to pin important worker progress to top
6. **Job Management** - UI controls for job cancellation and resumption

### Data Flow
1. User submits topic and depth via the frontend
2. Manager receives the job and generates a comprehensive outline
3. Workers are spawned for each section of the outline
4. Each worker conducts real research from trusted domains and generates content with proper citations and artifacts
5. Progress, content, and artifacts are streamed to the frontend in real-time via SSE
6. Final content is aggregated and displayed with all supporting artifacts

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

## New Features in Stage 2

1. **Real Research with Constrained, Ethical Retrieval** - Workers now retrieve and process actual content from trusted academic and research domains (arXiv, IEEE Xplore, NVD, etc.) instead of just relying on API calls
2. **Robust Provenance Tracking** - All claims now include provenance information showing their original source
3. **Complete Citations with Verification** - Enhanced citation system with verification status and claim support levels
4. **Per-Section Artifacts Index** - Each research section now generates relevant artifacts (summaries, tables, code snippets, mappings, etc.)
5. **Enhanced Resilience** - Added job cancellation and resumption capabilities for better error handling
6. **Improved Verification** - Claims are validated against their sources to ensure accuracy

## Known Limitations (Stage 2)

1. Limited to specific trusted domains for research (to ensure ethical retrieval)
2. Limited to cybersecurity topics (though architecture is flexible for other domains)
3. Some research capabilities still rely on API services for enhanced content generation

## Code Quality

- Rust code follows standard formatting (rustfmt)
- Linted with clippy for best practices
- Comprehensive test coverage
- Structured logging with tracing
- Type-safe SQL queries with sqlx

## License

[Specify your license here]
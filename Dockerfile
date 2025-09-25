# Use slim Alpine for faster downloads
FROM alpine:3.18

# Install Rust and build dependencies
RUN apk add --no-cache \
    rust \
    cargo \
    musl-dev \
    openssl-dev \
    pkgconf

# Set working directory
WORKDIR /app

# Copy project files
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
COPY static ./static

# Build the application
RUN cargo build --release

# Expose port
EXPOSE 3000

# Set environment variables
ENV RUST_LOG=info
ENV PORT=3000

# Run the application
CMD ["./target/release/cybersecurity-research-app"]
# Use the official Rust image as a parent image
FROM rust:1.75 as builder

# Set the working directory inside the container
WORKDIR /app

# Copy the Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy the source code
COPY src ./src
COPY migrations ./migrations
COPY static ./static

# Build the application
RUN cargo build --release

# Use a minimal base image for the final stage
FROM debian:bookworm-slim

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -r -s /bin/false appuser

# Set the working directory
WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/target/release/cybersecurity-research-app /app/
COPY --from=builder /app/static ./static
COPY --from=builder /app/migrations ./migrations

# Change ownership to the non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Expose the port
EXPOSE 3000

# Set environment variables
ENV RUST_LOG=info
ENV PORT=3000

# Run the application
CMD ["./cybersecurity-research-app"]
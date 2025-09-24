#!/bin/bash

# Build the Rust application for Netlify Functions
echo "Building Rust application..."
cd /workspaces/vibe

# Install rust target for Netlify's environment if needed
rustup target add x86_64-unknown-linux-musl

# Build the application
cargo build --target x86_64-unknown-linux-musl --release

# Create the functions directory
mkdir -p netlify/functions

# Copy the built binary to the functions directory
# Note: This is a simplified approach - in practice, you'd need to create individual function files
echo "Build complete!"
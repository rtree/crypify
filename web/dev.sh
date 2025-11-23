#!/bin/bash
# Load environment variables from .env.local (Cloud Run style)
set -a
source .env.local
set +a

# Start Next.js development server
exec pnpm next dev

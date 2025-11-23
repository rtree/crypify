#!/bin/bash
# Load environment variables from .env.local (Cloud Run style)
set -a
source .env.local
set +a

# Start the development server
exec pnpm tsx watch src/index.ts

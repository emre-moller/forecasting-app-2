#!/bin/bash
set -e

# Optional database seeding on startup
# Set SEED_DB=true to seed with test data
# Set RESET_DB=true to also drop existing tables first
if [ "$SEED_DB" = "true" ]; then
    echo "=== Seeding database with test data ==="
    if [ "$RESET_DB" = "true" ]; then
        echo "RESET_DB=true: Will drop and recreate all tables"
    fi
    python -m src.init_db
    echo "=== Database seeding complete ==="
fi

# Execute the main command (uvicorn)
exec "$@"

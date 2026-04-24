#!/bin/bash

# ============================================================
# AI Vendor Risk & Performance Scorer - Start Script
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_NAME="vendor_risk_scorer"
DB_USER="postgres"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     AI Vendor Risk & Performance Scorer                 ║"
echo "║     Starting Application...                             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Clean used ports ----
echo -e "${YELLOW}[1/6] Cleaning used ports...${NC}"
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
  PID=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo -e "  ${RED}Killing process on port $PORT (PID: $PID)${NC}"
    kill -9 $PID 2>/dev/null || true
    sleep 1
  fi
done
echo -e "  ${GREEN}Ports $BACKEND_PORT and $FRONTEND_PORT are clear${NC}"

# ---- Check PostgreSQL ----
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "  ${RED}PostgreSQL not found. Please install PostgreSQL.${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  sleep 3
fi
echo -e "  ${GREEN}PostgreSQL is running${NC}"

# ---- Create Database ----
echo -e "${YELLOW}[3/6] Setting up database...${NC}"
if ! psql -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo -e "  Creating database '$DB_NAME'..."
  createdb -U $DB_USER $DB_NAME 2>/dev/null || psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
fi
echo -e "  ${GREEN}Database '$DB_NAME' ready${NC}"

# ---- Install dependencies ----
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"
cd "$ROOT_DIR/backend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  npm install --silent 2>&1 | tail -1
fi
echo -e "  ${GREEN}Backend dependencies installed${NC}"

cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  npm install --silent 2>&1 | tail -1
fi
echo -e "  ${GREEN}Frontend dependencies installed${NC}"

# ---- Seed Database ----
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
cd "$ROOT_DIR/backend"
node src/seed.js
echo -e "  ${GREEN}Database seeded successfully${NC}"

# ---- Start Servers with hot reload ----
echo -e "${YELLOW}[6/6] Starting servers with hot reload...${NC}"

# Start backend with nodemon for auto-reload
cd "$ROOT_DIR/backend"
npx nodemon src/index.js --watch src &
BACKEND_PID=$!
echo -e "  ${GREEN}Backend started on port $BACKEND_PORT (PID: $BACKEND_PID) with auto-reload${NC}"

# Start frontend with React dev server (built-in hot reload)
cd "$ROOT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!
echo -e "  ${GREEN}Frontend started on port $FRONTEND_PORT (PID: $FRONTEND_PID) with hot reload${NC}"

# ---- Summary ----
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  ${GREEN}Application Started Successfully!${PURPLE}                      ║${NC}"
echo -e "${PURPLE}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC}  Frontend:  ${BLUE}http://localhost:$FRONTEND_PORT${PURPLE}                    ║${NC}"
echo -e "${PURPLE}║${NC}  Backend:   ${BLUE}http://localhost:$BACKEND_PORT/api${PURPLE}                ║${NC}"
echo -e "${PURPLE}║${NC}  Login:     ${GREEN}admin@vendorrisk.com / password123${PURPLE}       ║${NC}"
echo -e "${PURPLE}║${NC}  AI Model:  ${YELLOW}anthropic/claude-haiku-4.5${PURPLE}               ║${NC}"
echo -e "${PURPLE}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}Hot reload enabled - changes auto-refresh${PURPLE}             ║${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}Press Ctrl+C to stop all servers${PURPLE}                     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
  echo -e "\n${YELLOW}Shutting down servers...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  # Clean up any remaining processes on our ports
  for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill -9 $PID 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}All servers stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait

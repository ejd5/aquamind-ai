#!/bin/bash
# AQWELIA dev server — watchdog that restarts the server if it dies
cd /home/z/my-project

# Kill any existing server
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
sleep 2

# Start server function
start_server() {
  echo "[$(date)] Starting Next.js dev server..."
  NODE_OPTIONS="--max-old-space-size=2048" node node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
  echo $!
}

# Start the server
PID=$(start_server)
disown
echo "[$(date)] Server PID: $PID"

# Wait for server to be ready
for i in $(seq 1 30); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/auth/csrf 2>/dev/null)
  if [ "$HTTP" = "200" ]; then
    echo "[$(date)] Server ready at ${i}s"
    break
  fi
  sleep 1
done

# Watchdog loop - check every 10 seconds
while true; do
  sleep 10
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/api/auth/csrf 2>/dev/null)
  if [ "$HTTP" != "200" ]; then
    echo "[$(date)] Server not responding (HTTP $HTTP), restarting..."
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "next-server" 2>/dev/null
    sleep 2
    PID=$(start_server)
    disown
    echo "[$(date)] New server PID: $PID"
    # Wait for ready
    for i in $(seq 1 30); do
      HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/auth/csrf 2>/dev/null)
      if [ "$HTTP" = "200" ]; then
        echo "[$(date)] Server ready at ${i}s"
        break
      fi
      sleep 1
    done
  fi
done

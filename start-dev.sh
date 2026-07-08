#!/bin/bash
# AQWELIA dev server — persistent start script
# Keeps the server alive even after the parent shell exits
cd /home/z/my-project

# Kill any existing server
pkill -f "next dev" 2>/dev/null
sleep 2

# Start server in background with full detachment
nohup bun run dev > /tmp/aqwelia-dev.log 2>&1 &
echo $! > /tmp/aqwelia-dev.pid
disown

# Wait for server to be ready
for i in $(seq 1 60); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  if [ "$HTTP" = "200" ]; then
    echo "Server ready at ${i}s"
    exit 0
  fi
  sleep 1
done

echo "Server failed to start"
exit 1

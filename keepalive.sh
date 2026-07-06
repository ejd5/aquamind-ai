#!/bin/bash
# AquaMind keepalive — restart server if it dies
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "prsto" 2>/dev/null
    sleep 1
    # Start fresh
    nohup bun run dev > dev.log 2>&1 &
    SERVER_PID=$!
    echo "[$(date)] Started AquaMind server PID=$SERVER_PID"
    # Wait for it to be ready
    for i in $(seq 1 30); do
      if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null | grep -qE "200|304"; then
        echo "[$(date)] Server ready after ${i}s"
        break
      fi
      sleep 1
    done
  fi
  sleep 10
done

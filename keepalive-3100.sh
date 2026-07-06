#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server.*3100\|next dev -p 3100" > /dev/null 2>&1; then
    pkill -9 -f "next dev -p 3100" 2>/dev/null
    sleep 1
    nohup /home/z/my-project/node_modules/.bin/next dev -p 3100 > dev-3100.log 2>&1 &
    echo "[$(date)] Started AquaMind on port 3100"
    for i in $(seq 1 40); do
      if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/ 2>/dev/null | grep -qE "200|304"; then
        echo "[$(date)] Ready on 3100 after ${i}s"
        break
      fi
      sleep 1
    done
  fi
  sleep 8
done

#!/bin/bash
pkill -9 -f playwright 2>/dev/null || true
pkill -9 -f chrome 2>/dev/null || true
sleep 1
curl -s http://localhost:3001/api/settings 2>&1 | head -c 100

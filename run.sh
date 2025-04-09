#!/bin/bash
echo "Starting backend server..."
python3 server.py &
echo "Starting frontend..."
cd frontend
npm start
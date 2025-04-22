#!/bin/bash
echo "Starting backend server..."
python server.py &
echo "Starting frontend..."
cd frontend
npm start
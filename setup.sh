#!/bin/bash
echo "Installing Python..."
if ! command -v python3 &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install python
    else
        # Linux (assumes Debian/Ubuntu)
        sudo apt update
        sudo apt install -y python3 python3-pip
    fi
fi

echo "Installing Python dependencies..."
pip3 install flask flask-cors transformers torch

echo "Installing Node.js..."
if ! command -v node &> /dev/null; then
    if [[ "$
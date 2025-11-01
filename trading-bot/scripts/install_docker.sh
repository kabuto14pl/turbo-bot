#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script
# 🐳 Docker Installation Script for Ubuntu 24.04
# Quick Docker setup for Autonomous Trading Bot

echo "🐳 Installing Docker for Autonomous Trading Bot..."

# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
sudo apt-get update

# Install Docker Engine
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

echo "✅ Docker installed successfully!"
echo "📝 Note: You may need to log out and back in for group changes to take effect"

# Test installation
docker --version
docker-compose --version || docker compose version

echo "🚀 Ready to deploy Autonomous Trading Bot with Docker!"

#!/bin/bash

# Configuration
KEY_PATH="~/Downloads/botega.pem"
SERVER_USER="ubuntu"
SERVER_IP="15.237.174.132"
REMOTE_PATH="~/botegabot-api"
CONTAINER_NAME="botegabot-api"
IMAGE_NAME="botegabot-api"

echo "🚀 Starting deployment to $SERVER_IP..."

# 1. Sync code to server (excluding node_modules)
echo "📦 Syncing code..."
rsync -avz -e "ssh -i $KEY_PATH" \
    --exclude 'node_modules' \
    --exclude '.git' \
    ./ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/api

# 2. Rebuild and Restart on server
echo "🏗️  Rebuilding and restarting container on server..."
ssh -i $KEY_PATH $SERVER_USER@$SERVER_IP << EOF
    cd $REMOTE_PATH/api
    sudo docker build -t $IMAGE_NAME .
    sudo docker stop $CONTAINER_NAME || true
    sudo docker rm $CONTAINER_NAME || true
    sudo docker run -d \
        --name $CONTAINER_NAME \
        --network host \
        --restart unless-stopped \
        --env-file .env \
        $IMAGE_NAME
    sudo docker ps | grep $CONTAINER_NAME
EOF

echo "✅ Deployment complete!"

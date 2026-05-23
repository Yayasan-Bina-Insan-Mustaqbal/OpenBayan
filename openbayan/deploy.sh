#!/bin/bash
# Exit on error
set -e

# Always run from the directory where the script is located
cd "$(dirname "$0")"

echo "======================================================="
echo "  Deploying OpenBayan Frontend to Production Server"
echo "======================================================="

# Load environment variables
if [ -f .env ]; then
  # Read variables, ignoring lines with #
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found in $(pwd)"
  exit 1
fi

SSH_HOST=${PROD_SERVER_IP_TAILSCALE:-"100.101.207.74"}
SSH_PASS=${PROD_SERVER_PASS:-"cemara153"}
SSH_USER="root"
REMOTE_DIR="/root/openbayan-frontend"
TAR_NAME="deploy.tar.gz"
LOCAL_TAR="/tmp/${TAR_NAME}"

echo "Target: ${SSH_USER}@${SSH_HOST}:3000 (via Tailscale)"
echo "-------------------------------------------------------"

# 1. Archive local frontend workspace (excluding node_modules and .next)
echo "Step 1: Creating local deployment archive..."
tar -czf "${LOCAL_TAR}" \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude=".git" \
  --exclude="log" \
  --exclude="test-results" \
  .

# 2. Upload archive to production server
echo "Step 2: Transferring archive to production server..."
sshpass -p "${SSH_PASS}" scp -o StrictHostKeyChecking=no "${LOCAL_TAR}" "${SSH_USER}@${SSH_HOST}:/root/"

# 3. Remote extraction and Docker build
echo "Step 3: Extracting and deploying containers on remote host..."
sshpass -p "${SSH_PASS}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" "
  mkdir -p ${REMOTE_DIR}
  tar -xzf /root/${TAR_NAME} -C ${REMOTE_DIR}
  rm /root/${TAR_NAME}
  cd ${REMOTE_DIR}
  docker compose -f docker-compose.prod.yml up --build -d
"

# 4. Clean up local archive
echo "Step 4: Cleaning up local archive..."
rm -f "${LOCAL_TAR}"

echo "-------------------------------------------------------"
echo "Alhamdulillah, deployment completed successfully!"
echo "The application is now serving at: http://${SSH_HOST}:3000"
echo "Public Domain URL: https://openbayan.insanmustaqbal.or.id"
echo "======================================================="

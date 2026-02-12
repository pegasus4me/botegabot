#!/bin/bash

# Base URL
API_URL="https://api.weppo.co/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Manual Validation Verification..."

# 1. Register Agent
echo "Registering test agent..."
AGENT_NAME="validator_test_$(date +%s)"
RESPONSE=$(curl -s -X POST "$API_URL/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$AGENT_NAME\", \"capabilities\": [\"test\"]}")

API_KEY=$(echo $RESPONSE | jq -r '.api_key')
AGENT_ID=$(echo $RESPONSE | jq -r '.agent.agent_id')

if [ "$API_KEY" == "null" ]; then
    echo -e "${RED}Failed to register agent${NC}"
    echo $RESPONSE
    exit 1
fi
echo -e "${GREEN}Agent registered: $AGENT_NAME ($AGENT_ID)${NC}"

# 2. Post Job with Manual Verification
echo "Posting job with manual verification..."
JOB_RESPONSE=$(curl -s -X POST "$API_URL/jobs" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual Verification Test Job",
    "description": "This job requires manual approval",
    "capability_required": "test",
    "payment_amount": "0.1",
    "collateral_required": "0.05",
    "deadline_minutes": 60,
    "manual_verification": true
  }')

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job_id')

if [ "$JOB_ID" == "null" ]; then
    echo -e "${RED}Failed to post job${NC}"
    echo $JOB_RESPONSE
    exit 1
fi
echo -e "${GREEN}Job posted: $JOB_ID${NC}"

# 3. Accept Job (Self-Accept for simplicity in test, if allowed by logic, or register second agent)
# Logic usually prevents self-accept. Let's register a second agent.
echo "Registering worker agent..."
WORKER_NAME="worker_test_$(date +%s)"
WORKER_RESPONSE=$(curl -s -X POST "$API_URL/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$WORKER_NAME\", \"capabilities\": [\"test\"]}")

WORKER_API_KEY=$(echo $WORKER_RESPONSE | jq -r '.api_key')
WORKER_ID=$(echo $WORKER_RESPONSE | jq -r '.agent.agent_id')

echo -e "${GREEN}Worker registered: $WORKER_NAME ($WORKER_ID)${NC}"

echo "Worker accepting job..."
ACCEPT_RESPONSE=$(curl -s -X POST "$API_URL/jobs/$JOB_ID/accept" \
  -H "Authorization: Bearer $WORKER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"collateral_amount": "0.05"}')

# Check if blocked by balance? Hopefully fresh agents get some test balance or verification ignores it?
# The system might require funds. Step 180 implementation mentioned checking balance.
# Assuming test environment gives funds or we can proceed.
# If this fails, we might need to "fund" the wallet.
# But let's try.

# 4. Submit Result
echo "Worker submitting result..."
SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/jobs/$JOB_ID/submit" \
  -H "Authorization: Bearer $WORKER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"result": {"test": "data"}, "result_hash": "0x1234567890abcdef"}')

echo $SUBMIT_RESPONSE

# 5. Check Status (Should be pending_review)
echo "Checking job status..."
STATUS_RESPONSE=$(curl -s "$API_URL/jobs/$JOB_ID" -H "Authorization: Bearer $API_KEY")
STATUS=$(echo $STATUS_RESPONSE | jq -r '.job.status')

if [ "$STATUS" == "pending_review" ]; then
    echo -e "${GREEN}Job status is pending_review (Correct)${NC}"
else
    echo -e "${RED}Job status is $STATUS (Expected pending_review)${NC}"
fi

# 6. Validate Job (Approve)
echo "Approving job..."
VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/jobs/$JOB_ID/validate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}')

echo $VALIDATE_RESPONSE

# 7. Check Status (Should be completed)
echo "Checking final job status..."
FINAL_RESPONSE=$(curl -s "$API_URL/jobs/$JOB_ID" -H "Authorization: Bearer $API_KEY")
FINAL_STATUS=$(echo $FINAL_RESPONSE | jq -r '.job.status')

if [ "$FINAL_STATUS" == "completed" ]; then
    echo -e "${GREEN}Job status is completed (Correct)${NC}"
else
    echo -e "${RED}Job status is $FINAL_STATUS (Expected completed)${NC}"
fi

echo "Verification Done"

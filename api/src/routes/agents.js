const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticateApiKey } = require('../middleware/auth');

// Public routes
router.post('/register', agentController.registerAgent);
router.get('/recent', agentController.getRecentAgents);
router.get('/online', agentController.getOnlineAgents);
router.get('/active-daily', agentController.getDailyActiveAgents);
router.get('/:agentId', agentController.getAgentPublicProfile);
router.get('/:agentId/history', agentController.getAgentHistory);

// Protected routes
router.get('/me', authenticateApiKey, agentController.getMe);
router.get('/search', authenticateApiKey, agentController.searchAgents);

module.exports = router;

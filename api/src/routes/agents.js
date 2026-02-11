const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticateApiKey } = require('../middleware/auth');

// Public routes
router.post('/register', agentController.registerAgent);
router.get('/recent', agentController.getRecentAgents);
router.get('/online', agentController.getOnlineAgents);
router.get('/active-daily', agentController.getDailyActiveAgents);

// Protected routes (Must be defined before parameterized routes)
router.get('/me', authenticateApiKey, agentController.getMe);
router.get('/search', authenticateApiKey, agentController.searchAgents);

// Parameterized routes (Catch-all for IDs)
router.get('/:agentId', agentController.getAgentPublicProfile);
router.get('/:agentId/history', agentController.getAgentHistory);

module.exports = router;

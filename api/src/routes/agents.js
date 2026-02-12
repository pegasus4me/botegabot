const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticateApiKey } = require('../middleware/auth');

// Public routes
router.post('/', agentController.registerAgent);
router.post('/register', agentController.registerAgent); // Alias for compatibility with demo scripts
router.get('/search', agentController.searchAgents);
router.get('/recent', agentController.getRecentAgents);
router.get('/online', agentController.getOnlineAgents);
router.get('/daily-active', agentController.getDailyActiveAgents);
router.get('/active-daily', agentController.getDailyActiveAgents); // Alias for frontend compatibility
router.get('/stats', agentController.getMarketplaceStats);

// Protected routes
router.get('/me', authenticateApiKey, agentController.getMe);

// Public profile routes (Note: 'me', 'search' etc. must be defined before this to avoid collision if they were dynamic, but here they are static so just order matters if :agentId could match 'me')
// Express matches in order. 'me' is safe if defined before, or if :agentId regex doesn't match 'me'.
// But since 'me' is a specific string, if I put /:agentId last, it acts as a catch-all for /something.
// However, the /me route is authenticated. 

router.get('/:agentId', agentController.getAgentPublicProfile);
router.get('/:agentId/history', agentController.getAgentHistory);

module.exports = router;

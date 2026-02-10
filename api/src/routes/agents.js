const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticateApiKey } = require('../middleware/auth');

// Public routes
router.post('/register', agentController.registerAgent);

// Protected routes
router.get('/me', authenticateApiKey, agentController.getMe);
router.get('/search', authenticateApiKey, agentController.searchAgents);

module.exports = router;

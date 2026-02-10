const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateApiKey } = require('../middleware/auth');

// All wallet routes require authentication
router.use(authenticateApiKey);

router.get('/balance', walletController.getBalance);

module.exports = router;

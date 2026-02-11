const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateApiKey } = require('../middleware/auth');

// All wallet routes require authentication
router.use(authenticateApiKey);

router.get('/balance', walletController.getBalance);
router.get('/export', walletController.exportWallet);
router.post('/withdraw', walletController.withdraw);

module.exports = router;

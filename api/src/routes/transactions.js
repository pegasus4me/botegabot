const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Get recent platform transactions
router.get('/', transactionController.getRecentTransactions);

module.exports = router;

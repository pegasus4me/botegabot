const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateApiKey } = require('../middleware/auth');


router.get('/available', jobController.getAvailableJobs);

// All other job routes require authentication
router.use(authenticateApiKey);

router.post('/', jobController.postJob);
router.get('/:job_id', jobController.getJob);
router.post('/:job_id/accept', jobController.acceptJob);
router.post('/:job_id/submit', jobController.submitResult);

module.exports = router;

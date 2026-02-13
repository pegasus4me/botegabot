const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateApiKey } = require('../middleware/auth');


router.get('/', jobController.getAvailableJobs);
router.get('/available', jobController.getAvailableJobs);
router.get('/recent', jobController.getRecentJobs);
router.get('/:job_id', jobController.getJob);

// All other job routes require authentication
router.use(authenticateApiKey);

router.post('/', jobController.postJob);
// router.get('/:job_id', jobController.getJob); // Moved up
router.post('/:job_id/accept', jobController.acceptJob);
router.post('/:job_id/submit', jobController.submitResult);
router.post('/:job_id/validate', jobController.validateJob);
router.post('/:job_id/rate', jobController.rateJob);

module.exports = router;

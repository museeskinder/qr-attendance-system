const express = require('express');
const { markAttendance, getHistory, getStudentStats } = require('../controllers/attendanceController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles('student'));

router.post('/scan', markAttendance);
router.get('/history', getHistory);
router.get('/stats', getStudentStats);

module.exports = router;

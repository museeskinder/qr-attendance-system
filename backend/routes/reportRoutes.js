const express = require('express');
const { getActivityLogs, getAttendanceAnalytics, getIneligibleStudents, getStudentReports, exportPDF, exportExcel } = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/activity-logs', authorizeRoles('admin', 'instructor'), getActivityLogs);
router.get('/attendance-analytics', authorizeRoles('admin', 'instructor'), getAttendanceAnalytics);
router.get('/ineligible-students', authorizeRoles('admin', 'instructor'), getIneligibleStudents);
router.get('/student-reports', authorizeRoles('admin', 'instructor'), getStudentReports);
router.get('/export/pdf', authorizeRoles('admin', 'instructor'), exportPDF);
router.get('/export/excel', authorizeRoles('admin', 'instructor'), exportExcel);

module.exports = router;

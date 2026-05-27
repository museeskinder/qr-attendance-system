const express = require('express');
const { createSession, getSessions, updateSessionStatus, getSessionQRToken, getSessionReport, autoCloseExpiredSessions } = require('../controllers/sessionController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', authorizeRoles('instructor', 'admin'), createSession);
router.get('/', getSessions); // All authenticated users
router.put('/:id/status', authorizeRoles('instructor', 'admin'), updateSessionStatus);
router.get('/:id/qr', getSessionQRToken);
router.get('/:id/report', authorizeRoles('instructor', 'admin'), getSessionReport);

// Auto-close all sessions whose end_time has passed
router.post('/auto-close', authorizeRoles('instructor', 'admin'), autoCloseExpiredSessions);

module.exports = router;

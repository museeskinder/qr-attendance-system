// backend/routes/adminRoutes.js
const express = require('express');
const { getActivityLogs, listUsers, editUser, deleteUser } = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// All admin routes require auth + admin role
router.use(verifyToken, authorizeRoles('admin'));

router.get('/users', listUsers);
router.put('/users/:id', editUser);
router.delete('/users/:id', deleteUser);
router.get('/activity-logs', getActivityLogs);

module.exports = router;

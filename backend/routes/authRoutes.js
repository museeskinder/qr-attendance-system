const express = require('express');
const { register, login, createInstructor, changePassword, getInstructors, getDepartments, getInstructorCourses, updateInstructorCourses } = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/departments', getDepartments);

router.post('/instructor', verifyToken, authorizeRoles('admin'), createInstructor);
router.get('/instructors', verifyToken, authorizeRoles('admin'), getInstructors);
router.get('/instructor/:id/courses', verifyToken, authorizeRoles('admin'), getInstructorCourses);
router.put('/instructor/:id/courses', verifyToken, authorizeRoles('admin'), updateInstructorCourses);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;

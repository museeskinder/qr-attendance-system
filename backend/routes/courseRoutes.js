const express = require('express');
const { createCourse, getCourses, getCoursesByDepartment, updateCourseEligibility } = require('../controllers/courseController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// Publicly accessible for registration
router.get('/department/:id', getCoursesByDepartment);

router.use(verifyToken);

router.post('/', authorizeRoles('admin'), createCourse);
router.get('/', authorizeRoles('admin', 'instructor', 'student'), getCourses);
router.put('/:id/eligibility', authorizeRoles('admin', 'instructor'), updateCourseEligibility);

module.exports = router;


import { Router } from 'express';
import { getCourse, getCourses } from '../controllers/courses.controller.js';
import { postCourseWatch } from '../controllers/courseViews.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getCourses);
router.post('/:id/watch', requireAuth, postCourseWatch);
router.get('/:id', getCourse);

export default router;

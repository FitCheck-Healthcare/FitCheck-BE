import { Router } from 'express';
import { getMe, patchMe } from '../controllers/profiles.controller.js';
import { getMyCourseActivity } from '../controllers/courseViews.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getMe);
router.patch('/', requireAuth, patchMe);
router.get('/course-activity', requireAuth, getMyCourseActivity);

export default router;

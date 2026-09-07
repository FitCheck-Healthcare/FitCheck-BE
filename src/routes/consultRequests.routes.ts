import { Router } from 'express';
import {
  getConsultRequest,
  getMyConsultRequests,
  postConsultRequest,
} from '../controllers/consultRequests.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', optionalAuth, postConsultRequest);
router.get('/me', requireAuth, getMyConsultRequests);
router.get('/:id', requireAuth, getConsultRequest);

export default router;

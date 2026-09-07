import { Router } from 'express';
import {
  getGym,
  getGyms,
  getGymTrainers,
  getRecommendedGyms,
  postSyncNearbyGyms,
} from '../controllers/gyms.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/recommended', optionalAuth, getRecommendedGyms);
router.get('/', getGyms);
router.post('/sync-nearby', postSyncNearbyGyms);
router.get('/:gymId/trainers', getGymTrainers);
router.get('/:id', getGym);

export default router;

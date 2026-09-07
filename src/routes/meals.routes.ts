import { Router } from 'express';
import { getMeals, patchMeal, postMeal } from '../controllers/meals.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getMeals);
router.post('/', requireAuth, postMeal);
router.patch('/:id', requireAuth, patchMeal);

export default router;

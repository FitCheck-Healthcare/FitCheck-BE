import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import consultRequestsRoutes from './routes/consultRequests.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import gymsRoutes from './routes/gyms.routes.js';
import meRoutes from './routes/me.routes.js';
import mealsRoutes from './routes/meals.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.send('FitCheck Express 서버가 정상 작동 중입니다! 🚀');
});

app.get('/api/test', (_req: Request, res: Response) => {
  res.json({
    message: '성공적으로 서버와 연결되었습니다.',
    status: 'success',
  });
});

app.use('/api/v1/courses', coursesRoutes);
app.use('/api/v1/gyms', gymsRoutes);
app.use('/api/v1/consult-requests', consultRequestsRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/meals', mealsRoutes);
app.use('/api/v1/uploads', uploadsRoutes);

app.listen(PORT, () => {
  console.log(`✅ 서버가 실행되었습니다: http://localhost:${PORT}`);
  if (Number(PORT) === 5000) {
    console.log(
      '⚠️  macOS는 5000 포트를 AirPlay가 사용할 수 있습니다. 403이 나오면 .env의 PORT를 5001로 바꿔보세요.',
    );
  }
});

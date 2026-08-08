import express, { Request, Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    microservices: {
      auth: 'http://localhost:8001',
      marketplace: 'http://localhost:8002',
      eventBudget: 'http://localhost:8003',
      bookingPayment: 'http://localhost:8004',
      invitation: 'http://localhost:8005',
      guestFeedback: 'http://localhost:8006',
    },
  });
});

app.use('/api/v1/auth', createProxyMiddleware({ target: 'http://localhost:8001', changeOrigin: true }));
app.use('/api/v1/vendors', createProxyMiddleware({ target: 'http://localhost:8002', changeOrigin: true }));
app.use('/api/v1/events', createProxyMiddleware({ target: 'http://localhost:8003', changeOrigin: true }));
app.use('/api/v1/bookings', createProxyMiddleware({ target: 'http://localhost:8004', changeOrigin: true }));
app.use('/api/v1/invitations', createProxyMiddleware({ target: 'http://localhost:8005', changeOrigin: true }));
app.use('/api/v1/guests', createProxyMiddleware({ target: 'http://localhost:8006', changeOrigin: true }));

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on http://localhost:${PORT}`);
});

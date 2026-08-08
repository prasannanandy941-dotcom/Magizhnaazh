import { Express, Request, Response } from 'express';

export function registerHealthRoute(app: Express, serviceName: string) {
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'UP', service: serviceName, timestamp: new Date().toISOString() });
  });
}

import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Assigns/propagates a correlation ID (X-Request-Id) and logs one line per
 * request so the same requestId can be grepped for across every service's logs.
 */
export function requestLogger(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`[${serviceName}] [${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });

    next();
  };
}

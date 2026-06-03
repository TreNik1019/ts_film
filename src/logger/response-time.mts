import { type Context, type Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getLogger } from './logger.mts';

const logger = getLogger('responseTime', 'func');

export const responseTime = createMiddleware(async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    logger.debug('Response time: %d ms, %d', duration, c.res.status);
});

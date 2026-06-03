import { Hono } from 'hono';

export const router = new Hono();

router.get('/liveness', (c) => {
    return c.json({ status: 'up' });
});

router.get('/readiness', (c) => {
    return c.json({ status: 'up' });
});

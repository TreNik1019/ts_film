import { Hono, type Context, type Next } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { showRoutes } from 'hono/dev';
import { createMiddleware } from 'hono/factory';
import { secureHeaders } from 'hono/secure-headers';
import { type ZodError } from 'zod';
import { router as healthRouter } from './admin/health-router.mts';
import { corsOptions } from './config/cors.mts';
import { router as devRouter } from './config/dev/dev-router.mts';
import { env } from './config/env.mts';
import { paths } from './config/paths.mts';
import { filmRouter } from './film/router/film-router.mts';
import { router as filmWriteRouter } from './film/router/film-write-router.mts';
import {
    NotFoundError,
    VersionInvalidError,
    VersionOutdatedError,
} from './film/service/errors.mts';
import { getLogger } from './logger/logger.mts';
import { requestLogger } from './logger/request-logger.mts';
import { responseTime } from './logger/response-time.mts';
import { trackMetrics } from './monitoring/prometheus-metrics.mts';
import { router as prometheusRouter } from './monitoring/prometheus-router.mts';
import {
    createProblemDetails,
    forbidden,
    preconditionFailed,
    unauthorized,
    unprocessableContent,
} from './problem-details.mts';
import { router as authRouter } from './security/auth-router.mts';
import { ForbiddenError, UnauthorizedError } from './security/errors.mts';

export const app = new Hono();

const logger = getLogger('app', 'file');

// -----------------------------------------------------------------------------
// M i d d l e w a r e
// -----------------------------------------------------------------------------

const securityHeaders = createMiddleware(async (c: Context, next: Next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    await next();
});

app.use(secureHeaders(), cors(corsOptions), securityHeaders, compress());

app.use(trackMetrics);

if (logger.isLevelEnabled('debug')) {
    app.use(responseTime, requestLogger);
}

// -----------------------------------------------------------------------------
// R o u t e n
// -----------------------------------------------------------------------------
app.route(paths.rest, filmRouter);
app.route(paths.rest, filmWriteRouter);
app.route(paths.health, healthRouter);
app.route(paths.auth, authRouter);
app.route('/prometheus', prometheusRouter);

const { NODE_ENV } = env;
if (NODE_ENV === 'development' || NODE_ENV === 'test') {
    app.route(paths.dev, devRouter);
}

if (logger.isLevelEnabled('debug')) {
    showRoutes(app, {
        verbose: true,
    });
}

// -----------------------------------------------------------------------------
// E r r o r   H a n d l e r
// -----------------------------------------------------------------------------
app.onError((error, c) => {
    if (error instanceof NotFoundError) {
        // https://hono.dev/docs/api/context#notfound
        return c.notFound();
    }

    if (error.name === 'ZodError') {
        return createProblemDetails(
            c,
            unprocessableContent,
            (error as ZodError).issues,
        );
    }

    if (
        error instanceof VersionInvalidError ||
        error instanceof VersionOutdatedError
    ) {
        return createProblemDetails(c, preconditionFailed, error.message);
    }

    if (error instanceof UnauthorizedError) {
        return createProblemDetails(c, unauthorized, error.message);
    }

    if (error instanceof ForbiddenError) {
        return createProblemDetails(c, forbidden, error.message);
    }

    logger.error('Interner Fehler: %o', error);
    console.log(error.stack);
    return c.body('Interner Fehler', 500); // eslint-disable-line @typescript-eslint/no-magic-numbers
});

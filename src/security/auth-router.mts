/**
 * Das Modul besteht aus Router für die Authentifizierung an der
 * REST-Schnittstelle.
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { paths } from '../config/paths.mts';
import { container } from '../container.mts';
import { getLogger } from '../logger/logger.mts';
import { createProblemDetails, unauthorized } from '../problem-details.mts';

const logger = getLogger('auth-router', 'file');
const { keycloakService } = container;

/**
 * Datenobjekt für Login
 */
export class TokenData {
    /** Benutzername */
    username: string | undefined;

    /** Passwort */
    password: string | undefined;
}

/**
 * Router für Authentifizierung (Login) in der REST-Schnittstelle des Film-Projekts.
 */
export const router = new Hono();

/**
 * Endpoint: Token anfordern (Login gegen Keycloak).
 */
router.post(paths.token, async (c) => {
    const body: Record<string, string> = await c.req.parseBody();
    const { username, password } = body;
    logger.debug('post: username=%s', username);

    const result = await keycloakService.token({
        username,
        password,
    });
    if (result === undefined) {
        return createProblemDetails(
            c,
            unauthorized,
            'Fehler beim Authentifizieren',
        );
    }

    return c.json(result);
});

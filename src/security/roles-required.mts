import { type Context, type HonoRequest, type Next } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { JOSEError } from 'jose/errors';
import { keycloakConfig } from '../config/keycloak.mts';
import { getLogger } from '../logger/logger.mts';
import {
    ForbiddenError,
    InternalServerError,
    UnauthorizedError,
} from './errors.mts';

const logger = getLogger('roles-required', 'file');

type Rolle = 'admin' | 'user';

const { issuer, jwksUri, clientId, audience } = keycloakConfig;
const jwks = createRemoteJWKSet(new URL(jwksUri));

/**
 * Extrahiert das JWT aus dem Authorization Header.
 */
const getToken = (req: HonoRequest) => {
    const auth = req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authorization fehlt im Header');
    }
    const token = auth.slice(7); // oxlint-disable-line no-magic-numbers
    logger.debug('getToken: token=%s', token);
    return token;
};

/**
 * Verifiziert das JWT über JWKS (Keycloak Public Keys).
 */
const verifyToken = async (token: string) => {
    try {
        return await jwtVerify(token, jwks, {
            // siehe Properties innerhalb der Payload des Tokens
            issuer,
            audience,
        });
    } catch (err) {
        logger.debug('verifyToken: verifyResult err=%o', err as object);
        if (err instanceof JOSEError) {
            throw new UnauthorizedError('Token nicht (mehr) gueltig');
        }
        throw new InternalServerError();
    }
};

/**
 * Extrahiert Rollen aus dem JWT-Payload (Keycloak resource_access).
 */
const getRollen = (payload: any) => {
    const roles = payload?.resource_access?.[clientId]?.roles;
    if (!Array.isArray(roles)) {
        throw new ForbiddenError('Keine Rolle im Token enthalten');
    }
    logger.debug('getRollen: roles=%o', roles);
    return roles;
};

/**
 * Middleware für Rollenprüfung
 * Mindestens eine der angegebenen Rollen muss im Token vorhanden sein.
 */
export const rolesRequired =
    (...roles: Rolle[]) =>
    // @ts-ignore
    async (c: Context, next: Next) => {
        const { req } = c;

        // Token aus dem Request Header extrahieren
        const token = getToken(req);

        // Base64 in JSON decodieren und verifizieren
        const verifyResult = await verifyToken(token);
        if (verifyResult instanceof Response) {
            return verifyResult;
        }

        // Payload aus dem verifizierten JWT extrahieren
        const { payload } = verifyResult;
        logger.debug('rolesRequired: payload=%o', payload);

        // Rollen aus der Payload bei resource_access.CLIENT_ID.roles extrahieren
        const rollenResult = getRollen(payload);

        // Ist eine der erforderlichen Rollen in der Payload vorhanden?
        const rolleVorhanden = roles.some((role) =>
            rollenResult.includes(role),
        );
        if (!rolleVorhanden) {
            throw new ForbiddenError('Erforderliche Rolle nicht vorhanden');
        }

        // Payload fuer evtl. spaetere Verarbeitung im Request puffern
        (req as any).tokenPayload = payload;

        await next();
    };

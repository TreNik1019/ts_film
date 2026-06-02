/**
 * Wird geworfen, wenn keine gültige Authentifizierung vorliegt.
 */
export class UnauthorizedError extends Error {}

/**
 * Wird geworfen, wenn der Zugriff zwar authentifiziert,
 * aber nicht erlaubt ist.
 */
export class ForbiddenError extends Error {}

/**
 * Wird verwendet für unerwartete Server- oder Systemfehler.
 */
export class InternalServerError extends Error {}

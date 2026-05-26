import type pino from 'pino';
import { parentLogger } from '../config/logger.mts';

export const getLogger: (
    context: string,
    kid?: string,
) => pino.Logger<string> = (context: string, kid = 'class') => {
    const bindings: Record<string, string> = {};
    bindings[kid] = context;
    return parentLogger.child(bindings);
};

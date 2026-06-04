/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

import { type HonoRequest } from 'hono';
import { FilmService } from '../service/film-service.mts';

export const createBaseUrl: (req: HonoRequest) => string = (
    req: HonoRequest,
) => {
    const { url } = req;
    // Query-String entfernen, falls vorhanden
    let baseUrl = url.includes('?') ? url.slice(0, url.lastIndexOf('?')) : url;

    // ID entfernen, falls der Pfad damit endet
    const indexLastSlash = baseUrl.lastIndexOf('/');
    if (indexLastSlash > 0) {
        const idStr = baseUrl.slice(indexLastSlash + 1);
        if (FilmService.ID_PATTERN.test(idStr)) {
            baseUrl = baseUrl.slice(0, indexLastSlash);
        }
    }

    return baseUrl;
};

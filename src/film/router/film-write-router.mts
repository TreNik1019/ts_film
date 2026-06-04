/**
 * Router für die REST-Schnittstelle zur Verwaltung von Filmen.
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { File } from 'node:buffer';
import { container } from '../../container.mts';
import { Filmart } from '../../generated/prisma/browser.js';
import { getLogger } from '../../logger/logger.mts';
import {
    badRequest,
    createProblemDetails,
    preconditionRequired,
} from '../../problem-details.mts';
import { rolesRequired } from '../../security/roles-required.mts';
import {
    type FilmCreate,
    type FilmFileCreated,
    type FilmUpdate,
} from '../service/film-write-service.mts';
import { createBaseUrl } from './create-base-url.mts';
import {
    FilmNeuSchema,
    type FilmNeuType,
    FilmUpdateSchema,
    type FilmUpdateType,
} from './film-validation.mts';

const { filmWriteService } = container;

/**
 * Router für die Verwaltung von Filmen.
 */
export const router = new Hono();

const logger = getLogger('film-write-router', 'file');

// -----------------------------------------------------------------------------
// N e u e n  F i l m  a n l e g e n
// -----------------------------------------------------------------------------
const filmDtoToFilmCreateInput = (filmDTO: FilmNeuType): FilmCreate => {
    const cover = filmDTO.cover?.map((coverDTO) => {
        const abbildung = {
            info: coverDTO.info,
            contentType: coverDTO.contentType,
        };
        return abbildung;
    });
    const filmartMap = {
        DVD: Filmart.DVD,
        BlueRay: Filmart.BlueRay,
        '4K': Filmart.K,
    } as const;

    const film: FilmCreate = {
        version: 0,
        titel: filmDTO.titel,
        art:
            filmDTO.art === undefined
                ? null
                : filmartMap[filmDTO.art as keyof typeof filmartMap],
        erscheinungsdatum: filmDTO.erscheinungsdatum,
        genre: filmDTO.genre,
        rating: filmDTO.rating,
        verfuegbar: filmDTO.verfuegbar ?? false,
        preis: filmDTO.preis,
        schlagwoerter: filmDTO.schlagwoerter ?? [],
        regisseur: {
            create: {
                name: filmDTO.regisseur.name,
                geburtsjahr: filmDTO.regisseur.geburtsjahr ?? null,
            },
        },
        cover: { create: cover ?? [] },
    };
    return film;
};

router.post('/', rolesRequired('admin', 'user'), async (c) => {
    const requestBody = await c.req.json();

    // Validierung mit Zod: ZodError wird geworfen, falls Validierung nicht erfolgreich
    const filmDTO: FilmNeuType = FilmNeuSchema.parse(requestBody);
    logger.debug('post: filmDTO=%o', filmDTO);

    const film = filmDtoToFilmCreateInput(filmDTO);
    const id = await filmWriteService.create(film);

    const location = `${createBaseUrl(c.req)}/${id}`;
    const { header, body } = c;
    header('Location', location);
    return body(null, 201);
});

// -----------------------------------------------------------------------------
// F i l m   a k t u a l i s i e r e n
// -----------------------------------------------------------------------------
const filmartMap = {
    DVD: Filmart.DVD,
    BlueRay: Filmart.BlueRay,
    '4K': Filmart.K,
} as const;

const filmDtoToFilmUpdate = (filmDTO: FilmUpdateType): FilmUpdate => {
    return {
        version: 0,
        titel: filmDTO.titel,
        art:
            filmDTO.art === undefined
                ? null
                : filmartMap[filmDTO.art as keyof typeof filmartMap],
        erscheinungsdatum: filmDTO.erscheinungsdatum,
        genre: filmDTO.genre,
        rating: filmDTO.rating,
        verfuegbar: filmDTO.verfuegbar ?? false,
        preis: filmDTO.preis,
        schlagwoerter: filmDTO.schlagwoerter ?? [],
    };
};

router.put('/:id', rolesRequired('admin', 'user'), async (c) => {
    const { req } = c;
    const id = req.param('id') ?? '-1';
    logger.debug('put: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        // https://hono.dev/docs/api/context#notfound
        return c.notFound();
    }

    // https://hono.dev/docs/api/request#header
    const version = req.header('If-Match');
    logger.debug('put: version=%s', version);
    if (version === undefined) {
        logger.debug('put: version === undefined');
        return createProblemDetails(
            c,
            preconditionRequired,
            'Header "If-Match" fehlt',
        );
    }

    const requestBody = await c.req.json();
    logger.debug('put: requestBody=%o', requestBody);

    // Validierung mit Zod
    const filmDTO: FilmUpdateType = FilmUpdateSchema.parse(requestBody);
    logger.debug('put: filmDTO=%o', filmDTO);

    const film = filmDtoToFilmUpdate(filmDTO);
    const neueVersion = await filmWriteService.update({
        id: idNumber,
        film,
        version,
    });
    logger.debug('put: neueVersion=%d', neueVersion);
    const headers = {
        ETag: `"${neueVersion}"`,
    };
    return c.body(null, 204, headers);
});

// -----------------------------------------------------------------------------
// F i l m L o e s c h e n
// -----------------------------------------------------------------------------
router.delete('/:id', rolesRequired('admin'), async (c) => {
    const id = c.req.param('id') ?? '-1';
    logger.debug('delete: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    const { body } = c;
    if (Number.isNaN(idNumber)) {
        return body(null, 204);
    }

    await filmWriteService.delete(idNumber);
    return body(null, 204);
});

// -----------------------------------------------------------------------------
// F i l e   U p l o a d
// -----------------------------------------------------------------------------
router.post('/:id', rolesRequired('admin', 'user'), async (c) => {
    const id = c.req.param('id') ?? '-1';
    logger.debug('upload: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        return c.notFound();
    }

    const contentType = c.req.header('Content-Type');
    logger.debug('upload: contentType=%s', contentType);

    // https://hono.dev/examples/file-upload
    // https://dev.to/aaronksaunders/quick-rest-api-file-upload-with-hono-js-and-drizzle-49ok
    const body = await c.req.parseBody();
    const { file } = body;
    if (file === undefined || (Array.isArray(file) && file.length !== 1)) {
        return createProblemDetails(
            c,
            badRequest,
            'Keine oder mehrere Dateien hochgeladen',
        );
    }
    if (!(file instanceof File)) {
        return createProblemDetails(
            c,
            badRequest,
            `Ungueltiger Typ beim Upload: ${typeof file}`,
        );
    }

    const { name, size, type } = file;
    logger.debug('upload: name=%s, size=%d, type=%s', name, size, type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const filmFile: FilmFileCreated | undefined =
        await filmWriteService.addFile(idNumber, buffer, name, size, type);
    logger.debug(
        'upload: id=%s, byteLength=%s, filename=%s, mimetype=%s',
        filmFile?.id,
        filmFile?.data.byteLength,
        filmFile?.filename,
        filmFile?.mimetype,
    );

    const location = `${createBaseUrl(c.req)}/file/${id}`;
    c.header('Location', location);
    return c.body(null, 204);
});

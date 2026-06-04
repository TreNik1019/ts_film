import { beforeAll, describe, expect, test } from 'vitest';
import { type FilmNeuType } from '../../../src/film/router/film-validation.mts';
import { FilmService } from '../../../src/film/service/film-service.mts';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mts';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuerFilm: Omit<FilmNeuType, 'preis'> & {
    preis: number;
} = {
    titel: 'The Equalizer',
    art: 'DVD',
    erscheinungsdatum: '2006-10-24',
    genre: 'Action',
    rating: 10.0,
    verfuegbar: true,
    preis: 24.99,
    schlagwoerter: ['SPANNEND', 'TRAURIG', 'GRUSELIG'],
    regisseur: {
        name: 'Antoine Fuqua',
        geburtsjahr: 1966,
    },
    cover: [
        {
            info: 'Cover 2',
            contentType: 'image/jpeg',
        },
    ],
};
const neuerFilmInvalid: Record<string, unknown> = {
    titel: 'The Equalizer: Auf Messers Schneide zwischen Gerechtigkeit und Vergeltung',
    art: 'Unknown',
    erscheinungsdatum: '2100',
    genre: 'Kindergarten',
    rating: -10.0,
    verfuegbar: true,
    preis: -24.99,
    schlagwoerter: ['SPANNEND', 'TRAURIG', 'GRUSELIG'],
    regisseur: {
        name: 'Antoine-Feger!',
        geburtsjahr: 2222,
    },
};

type MessageType = { message: string };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neuer Film', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilm),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(201);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(FilmService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    test.concurrent('Neuer Film mit ungueltigen Daten', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedMsg = [
            expect.stringMatching(/^regisseur.name /u),
            expect.stringMatching(/^regisseur.geburtsjahr /u),
            expect.stringMatching(/^titel /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^genre /u),
            expect.stringMatching(/^rating /u),
            expect.stringMatching(/^preis /u),
        ];

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilmInvalid),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(400);

        const body = (await response.json()) as MessageType;
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test.concurrent('Neuer Film, aber ohne Token', async () => {
        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilm),
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Neuer Film, aber mit falschem Token', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerFilm),
            headers,
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent.todo('Abgelaufener Token');
});

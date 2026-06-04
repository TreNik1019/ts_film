import { beforeAll, describe, expect, test } from 'vitest';
import { type FilmUpdateType } from '../../../src/film/router/film-validation.mts';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    PUT,
    restURL,
} from '../constants.mts';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaenderterFilm: Omit<FilmUpdateType, 'preis'> & {
    preis: number;
} = {
    titel: 'Inception',
    art: 'DVD',
    erscheinungsdatum: new Date('2010-07-16T00:00:00.000Z'),
    genre: 'ScienceFiction',
    rating: 9.3,
    verfuegbar: true,
    preis: 14.99,
    schlagwoerter: ['ROMANTISCH'],
};
const idVorhanden = '3';

const geaenderterFilmIdNichtVorhanden: Omit<FilmUpdateType, 'preis'> & {
    preis: number;
} = {
    titel: 'InceptionE',
    art: 'BlueRay',
    erscheinungsdatum: new Date('2010-07-16T00:00:00.000Z'),
    genre: 'ScienceFiction',
    rating: 9.3,
    verfuegbar: true,
    preis: 14.99,
    schlagwoerter: ['ROMANTISCH'],
};
const idNichtVorhanden = '100';

const geaenderterFilmInvalid: Record<string, unknown> = {
    titel: 'Kein Titel – Die unerwartete Wahrheit hinter dem Verborgenen',
    art: 'Schallplatte',
    erscheinungsdatum: 'gestern',
    genre: 'Leere',
    rating: -6.9,
    verfuegbar: true,
    preis: -18.99,
    schlagwoerter: ['ACTION'],
};

const veralteterFilm: FilmUpdateType = {
    titel: 'InterstellarA',
    art: 'BlueRay',
    erscheinungsdatum: new Date('2014-11-07T00:00:00.000Z'),
    genre: 'ScienceFiction',
    rating: 8.8,
    verfuegbar: true,
    preis: 16.49,
    schlagwoerter: ['AUFREGEND', 'TRAURIG', 'SPANNEND'],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandenen Film aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilm),
            headers,
        });

        // then
        expect(status).toBe(204);
    });

    test('Nicht-vorhandenen Film aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilmIdNichtVorhanden),
            headers,
        });

        // then
        expect(status).toBe(404);
    });

    test('Vorhandenen Film aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);
        const expectedMsg = [
            expect.stringMatching(/^titel /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^erscheinungsDatum /u),
            expect.stringMatching(/^genre /u),
            expect.stringMatching(/^rating /u),
            expect.stringMatching(/^preis /u),
        ];

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilmInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(400);

        const body = (await response.json()) as { message: string[] };
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test('Vorhandenen Film aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilm),
            headers,
        });

        // then
        expect(response.status).toBe(428);

        const body = await response.text();

        expect(body).toBe(`Header "${IF_MATCH}" fehlt`);
    });

    test('Vorhandenen Film aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"-1"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(veralteterFilm),
            headers,
        });

        // then
        expect(response.status).toBe(412);

        const { message, statusCode } = (await response.json()) as {
            message: string;
            statusCode: number;
        };

        expect(message).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(412);
    });

    test('Vorhandenen Film aendern, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilm),
            headers,
        });

        // then
        expect(status).toBe(401);
    });

    test('Vorhandenen Film aendern, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilm),
            headers,
        });

        // then
        expect(status).toBe(401);
    });
});

import { beforeAll, describe, expect, test } from 'vitest';
import { type FilmUpdateType } from '../../../src/film/router/film-validation.mts';
import { ProblemDetails } from '../../../src/problem-details.mts';
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
const geaenderterFilm: Omit<FilmUpdateType, 'preis' | 'erscheinungsdatum'> & {
    preis: number;
    erscheinungsdatum: string;
} = {
    titel: 'Inception',
    art: 'DVD',
    erscheinungsdatum: '2010-07-16T00:00:00Z',
    genre: 'ScienceFiction',
    rating: 4.3,
    verfuegbar: true,
    preis: 14.99,
    schlagwoerter: ['ROMANTISCH'],
};
const idVorhanden = '3';

const geaenderterFilmIdNichtVorhanden: Omit<
    FilmUpdateType,
    'preis' | 'erscheinungsdatum'
> & {
    preis: number;
    erscheinungsdatum: string;
} = {
    titel: 'InceptionE',
    art: 'BlueRay',
    erscheinungsdatum: '2010-07-16T00:00:00Z',
    genre: 'ScienceFiction',
    rating: 4.3,
    verfuegbar: true,
    preis: 14.99,
    schlagwoerter: ['ROMANTISCH'],
};
const idNichtVorhanden = '100';

const geaenderterFilmInvalid: Record<string, unknown> = {
    titel: '',
    art: 'Schallplatte',
    erscheinungsdatum: 'gestern',
    genre: 'Leere',
    rating: -6.9,
    verfuegbar: true,
    preis: -18.99,
    schlagwoerter: ['ACTION'],
};

const veralteterFilm: Omit<FilmUpdateType, 'preis' | 'erscheinungsdatum'> & {
    preis: number;
    erscheinungsdatum: string;
} = {
    titel: 'InterstellarA',
    art: 'BlueRay',
    erscheinungsdatum: '2014-11-07T00:00:00Z',
    genre: 'ScienceFiction',
    rating: 4.8,
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
        const expectedPaths = [
            'titel',
            'art',
            'erscheinungsdatum',
            'genre',
            'rating',
            'preis',
        ];

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterFilmInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(422);

        const body = (await response.json()) as ProblemDetails;
        const { detail } = body;

        expect(detail).toBeDefined();
        expect(detail).toHaveLength(expectedPaths.length);

        const paths = detail.map((d: any) => d.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
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

        const { detail, statusCode } =
            (await response.json()) as ProblemDetails;

        expect(detail).toContain(IF_MATCH);
        expect(statusCode).toBe(428);
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

        const { detail, statusCode } =
            (await response.json()) as ProblemDetails;

        expect(detail).toMatch(/Versionsnummer/u);
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

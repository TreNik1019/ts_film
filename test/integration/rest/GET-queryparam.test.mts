import BigNumber from 'bignumber.js';
import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/film/router/page.mts';
import { FilmMitRegisseur } from '../../../src/film/service/film-service.mts';
import { Film } from '../../../src/generated/prisma/client.ts';
import { CONTENT_TYPE, restURL } from '../constants.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const regisseurArray = ['a', 'l', 't'];
const regisseurNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const ratingMin = [8, 9];
const preisMax = [33.5, 66.6];
const schlagwoerter = ['romantisch', 'spannend'];
const schlagwoerterNichtVorhanden = ['csharp', 'cobol'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GET /rest', () => {
    test.concurrent('Alle Filme', async () => {
        // given
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const response = await fetch(restURL, { headers: requestHeaders });
        const { status, headers } = response;

        // then
        expect(status).toBe(200);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<Film>;

        body.content
            .map((film) => film.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent.each(regisseurArray)(
        'Filme mit Teil-Regisseur %s suchen',
        async (name) => {
            // given
            const params = new URLSearchParams({ regisseur: name });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<FilmMitRegisseur>;

            expect(body).toBeDefined();

            // Jeder Film hat einen Regisseur mit dem Teilstring
            body.content
                .map((film) => film.regisseur)
                .forEach((r) =>
                    expect(r?.name?.toLowerCase()).toStrictEqual(
                        expect.stringContaining(name),
                    ),
                );
        },
    );

    test.concurrent.each(regisseurNichtVorhanden)(
        'Filme zu nicht vorhandenem Teil-Regisseur %s suchen',
        async (regisseur) => {
            // given
            const params = new URLSearchParams({ regisseur });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent.each(ratingMin)(
        'Filme mit Mindest-"rating" %i suchen',
        async (rating) => {
            // given
            const params = new URLSearchParams({ rating: rating.toString() });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Film>;

            // Jeder Film hat eine Bewertung >= rating
            body.content
                .map((film) => Number(film.rating))
                .forEach((r) => expect(r).toBeGreaterThanOrEqual(rating));
        },
    );

    test.concurrent.each(preisMax)(
        'Filme mit max. Preis %d suchen',
        async (preis) => {
            // given
            const params = new URLSearchParams({ preis: preis.toString() });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Film>;

            // Jeder Film hat einen Preis <= preis
            body.content
                .map((film) => BigNumber(film?.preis?.toString() ?? 0))
                .forEach((p) =>
                    expect(p.isLessThanOrEqualTo(BigNumber(preis))).toBe(true),
                );
        },
    );

    test.concurrent.each(schlagwoerter)(
        'Mind. 1 Film mit Schlagwort %s',
        async (schlagwort) => {
            // given
            const params = new URLSearchParams({ [schlagwort]: 'true' });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Film>;

            // JSON-Array mit mind. 1 JSON-Objekt
            expect(body).toBeDefined();

            // Jeder Film hat im Array der Schlagwoerter z.B. "romantisch"
            body.content
                .map((film) => film.schlagwoerter)
                .forEach((schlagwoerter) =>
                    expect(schlagwoerter).toStrictEqual(
                        expect.arrayContaining([schlagwort.toUpperCase()]),
                    ),
                );
        },
    );

    test.concurrent.each(schlagwoerterNichtVorhanden)(
        'Keine Filme zu einem nicht vorhandenen Schlagwort',
        async (schlagwort) => {
            const params = new URLSearchParams({ [schlagwort]: 'true' });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent(
        'Keine Filme zu einer nicht-vorhandenen Property',
        async () => {
            // given
            const params = new URLSearchParams({ foo: 'bar' });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );
});

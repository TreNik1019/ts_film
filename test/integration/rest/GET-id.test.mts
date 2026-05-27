import { describe, expect, test } from 'vitest';
import { CONTENT_TYPE, IF_NONE_MATCH, restURL } from '../constants.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const ids = [2, 10];
const idNichtVorhanden = 999999;
const idsETag = [2, 10];
const idFalsch = 'xy';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('GET /rest/:id', () => {
    test.concurrent.each(ids)('Film zu vorhandener ID %i', async (id) => {
        // given
        const url = `${restURL}/${id}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const response = await fetch(url, { headers: requestHeaders });
        const { status, headers } = response;

        // then
        expect(status).toBe(200);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as { id: number };

        expect(body.id).toBe(id);
    });

    test.concurrent('Keinen Film zu nicht-vorhandener ID', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const { status } = await fetch(url, { headers: requestHeaders });

        // then
        expect(status).toBe(404);
    });

    test.concurrent('Keinen Film zu falscher ID', async () => {
        // given
        const url = `${restURL}/${idFalsch}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const { status } = await fetch(url, { headers: requestHeaders });

        // then
        expect(status).toBe(404);
    });

    test.concurrent.each(idsETag)(
        'Film zu ID %i mit If-None-Match',
        async (id) => {
            // given
            const url = `${restURL}/${id}`;
            const headers = new Headers();
            headers.append('Accept', 'application/json');
            headers.append(IF_NONE_MATCH, '"0"');

            // when
            const response = await fetch(url, { headers });
            const { status } = response;

            // then
            expect(status).toBe(304);

            const body = await response.text();

            expect(body).toBe('');
        },
    );
});

import { AUTHORIZATION, baseURL, BEARER, POST } from './constants.mts';
import { getToken } from './token.mts';

const dbPopulate = async (token: string) => {
    const url = `${baseURL}/dev/db_populate`;
    const headers = new Headers();
    headers.append(AUTHORIZATION, `${BEARER} ${token}`);

    const response = await fetch(url, {
        method: POST,
        headers,
    });

    const { db_populate } = (await response.json()) as { db_populate: string };
    if (db_populate !== 'ok') {
        throw new Error('Fehler bei POST /dev/db_populate');
    }
    console.log('DB wurde neu geladen');
};

export default async function setup() {
    const token = await getToken('admin', 'p');
    console.log(`setup: token=${token}`);
    await dbPopulate(token);
}

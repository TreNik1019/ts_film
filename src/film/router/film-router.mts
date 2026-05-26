import { Hono } from 'hono';
import { container } from '../../container.mts';
import { getLogger } from '../../logger/logger.mts';

const { filmService } = container;

export const filmRouter = new Hono();

const logger = getLogger('FilmRouter', 'file');

filmRouter.get('/:id', async (c) => {
    const { req } = c;
    const accept = req.header('Accept')?.toLowerCase();
    if (accept !== undefined && !/(json|html)/.test(accept)) {
        logger.debug('get: Accept=%s', accept);
        return c.body(null, 406);
    }

    const id = req.param('id');
    logger.debug('get: id=%s', id);
    const IdNumber = Number.parseInt(id, 10);
    if (Number.isNaN(IdNumber)) {
        return c.notFound();
    }

    const film = await filmService.findById({ id: IdNumber });

    const ifNoneMatch = req.header('If-None-Match');
    const { version } = film;
    if (ifNoneMatch === `"${version}"`) {
        logger.debug('get: Not Modified');
        return c.body(null, 304);
    }

    logger.debug('get: version=%d', version ?? -1);
    const { header, json } = c;
    header('ETag', `"${version}"`);

    logger.debug('get: film=%o', film);
    return json(film);
});

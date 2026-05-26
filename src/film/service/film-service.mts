import { prismaClient } from '../../config/prisma-client.mts';
import { type Prisma } from '../../generated/prisma/client.ts';
import { type FilmInclude } from '../../generated/prisma/models/Film.ts';
import { getLogger } from '../../logger/logger.mts';
import { NotFoundError } from './errors.mts';

type FindByIdParams = {
    readonly id: number;
    readonly mitCover?: boolean;
}

export type FilmMitRegisseur = Prisma.FilmGetPayload<{
    include: {  regisseur: true };
}>;

export type FilmMitRegisseurUndCover = Prisma.FilmGetPayload<{
    include: {
        regisseur: true;
        cover: true;
    }
}>;

export class FilmService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #includeRegisseur: FilmInclude = { regisseur: true };
    readonly #includeRegisseurUndCover: FilmInclude = {
        regisseur: true,
        cover: true,
    };

    readonly #logger = getLogger(FilmService.name);

    async findById({
        id,
        mitCover,
    }: FindByIdParams): Promise<Readonly<FilmMitRegisseurUndCover>> {
        this.#logger.debug('findById: id=%d', id);

        const include = mitCover
            ? this.#includeRegisseurUndCover
            : this.#includeRegisseur
        const film: FilmMitRegisseurUndCover | null =
            await prismaClient.film.findUnique({
                where: { id },
                include,
            })
        if (film === null) {
            this.#logger.debug('Es gibt keinen Film mit der angegebenen ID %d', id);
            throw new NotFoundError(`Es gibt keine Filme mit der angegebenen ID ${id}.`)
        }
        film.schlagwoerter ??= [];

        this.#logger.debug('findById: film=%o', film);
        return film;
    }
}

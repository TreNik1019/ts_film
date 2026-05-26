import { prismaClient } from '../../config/prisma-client.mts';
import { type Prisma } from '../../generated/prisma/client.ts';
import { type FilmInclude } from '../../generated/prisma/models/Film.ts';
import { getLogger } from '../../logger/logger.mts';
import { NotFoundError } from './errors.mts';
import { Pageable } from './pageable.mts';

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

    async find(
        suchparameter: Suchparameter | undefined
    ): Promise<Readonly<Slice<Readonly<FilmMitRegisseur>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(suchparameter),
            pageable,
        );

        if (suchparameter === undefined) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(suchparameter);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        if (!this.#validateKeys(keys) || !this.#validateEnums(suchparameter)) {
            this.#logger.debug('Ungueltige Suchparameter');
            throw new NotFoundError('Ungueltige Suchparameter');
        }

        const where = buildWhere(suchparameter);
        const { number, size } = pageable;
        const filme: FilmMitRegisseur[] = await prismaClient.film.findMany({
            where,
            skip: number * size,
            take: size,
            include: this.#includeRegisseur,
        });
        if (filme.length === 0) {
            this.#logger.debug('Keine Filme gefunden');
            throw new NotFoundError(
                `Keine Filme gefunden: ${JSON.stringify(suchparameter)}, Seite ${pageable.number}`
            );
        }
        const totalElements = await this.count(where);
        return this.#createSlice(filme, totalElements);
    }

    async count(where: Prisma.FilmWhereInput) {
        this.#logger.debug('count: where=%o', where ?? 'undefined');
        const { count } = prismaClient.film;
        const anzahl =
            where === undefined ? await count() : await count({ where });
        this.#logger.debug('count: %d', anzahl);
        return anzahl;
    }

    async #findAll(pageable: Pageable): Promise<Readonly<Slice<FilmMitRegisseur>>> {
        const { number, size } = pageable;
        const filme: FilmMitRegisseur[] = await prismaClient.film.findMany({
            skip: number * size,
            take: size,
            include: this.#includeRegisseur,
        });
        if (filme.length === 0) {
            this.#logger.debug('Keine Filme gefunden');
            throw new NotFoundError(`Keine Filme gefunden, Seite ${pageable.number}`);
        }
        const totalElements = await this.count();
        return this.#createSlice(filme, totalElements);
    }

    #createSlice(
        filme: FilmMitRegisseur[],
        totalElements: number.
    ): Readonly<Slice<FilmMitRegisseur>> {
        filme.forEach((film) => {
            film.schlagwoerter ??= []
        });
        const filmSlice: Slice<FilmMitRegisseur> = {
            content: filme,
            totalElements,
        };
        this.#logger.debug('createSlice: filmSlice=%o', filmSlice);
        return filmSlice;
    }

    #validateKeys(keys: string[]) {
        this.#logger.debug('validateKeys: keys=%o', keys);
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !suchparameterNamen.includes(key) &&
                key !== 'aufregend' &&
                key !== 'spannend' &&
                key !== 'gruselig' &&
                key !== 'traurig' &&
                key !== 'romantisch' &&
                key !== 'lustig'
            ) {
                this.#logger.debug(
                    `#validateKeys: Ungueltige Suchparameter "%s"`,
                    key,
                );
                validKeys = false;
            }
        });
        return validKeys;
    }

    #checkEnums(suchparameter: Suchparameter) {
        const { genre, art } = suchparameter;
        this.#logger.debug(
            '#checkEnums: Suchparameter "genre=%s", "art=%s"',
            genre ?? 'undefined',
            art ?? 'undefined',
        );

        const Genres = [
            'Action',
            'Drama',
            'Thriller',
            'Musical',
            'ScienceFiction',
            'Biografie',
        ];
        const Arten = ['DVD', 'BlueRay', '4k'];

        const validGenre = genre === undefined || Genres.includes(genre);
        const validArten = art === undefined || Arten.includes(art);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return validGenre && validArten;
    }
}

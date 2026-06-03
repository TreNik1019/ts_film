import { prismaClient } from '../../config/prisma-client.mts';
import { type Prisma } from '../../generated/prisma/client.ts';
import { getLogger } from '../../logger/logger.mts';
import { sendmail } from '../../mail/sendmail.mts';
import {
    NotFoundError,
    VersionInvalidError,
    VersionOutdatedError,
} from './errors.mts';
import { FilmService } from './film-service.mts';

export type FilmCreate = Prisma.FilmCreateInput;
type FilmCreated = Prisma.FilmGetPayload<{
    include: {
        regisseur: true;
        cover: true;
    };
}>;

export type FilmUpdate = Prisma.FilmUpdateInput;
export type UpdateParams = {
    readonly id: number | undefined;
    readonly film: FilmUpdate;
    readonly version: string;
};
type FilmUpdated = Prisma.FilmGetPayload<{}>;

export class FilmWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #readService: FilmService;

    readonly #logger = getLogger(FilmWriteService.name);

    constructor(readService: FilmService) {
        this.#readService = readService;
    }

    // TODO: File
    // TODO: Validierung vor Erstellen
    async create(film: FilmCreate) {
        this.#logger.debug('create: film=%o', film);

        let filmDb: FilmCreated | undefined;
        await prismaClient.$transaction(async (tx) => {
            filmDb = await tx.film.create({
                data: film,
                include: {
                    regisseur: true,
                    cover: true,
                },
            });
        });
        await this.#sendmail({
            id: filmDb?.id ?? 'N/A',
            name: filmDb?.regisseur?.name ?? 'N/A',
        });

        this.#logger.debug('create: filmDb.id=%s', filmDb?.id);
        return filmDb?.id ?? Number.NaN;
    }

    async update({ id, film, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%s, film=%o, version=%s',
            id,
            film,
            version,
        );

        if (id === undefined) {
            this.#logger.warn('update: id is undefined');
            throw new NotFoundError(`Es gibt keinen Film mit der ID ${id}.`);
        }

        await this.#validateUpdate(id, version);

        film.version = { increment: 1 };
        let filmUpdated: FilmUpdated | undefined;
        await prismaClient.$transaction(async (tx) => {
            filmUpdated = await tx.film.update({
                data: film,
                where: { id },
            });
        });
        this.#logger.debug(
            'update: filmUpdated.id=%s',
            JSON.stringify(filmUpdated),
        );
        return filmUpdated?.id ?? Number.NaN;
    }

    async #sendmail({ id, name }: { id: number | 'N/A'; name: string }) {
        const subject = `Neuer Film mit ID ${id}`;
        const body = `Ein neuer Film von dem Regisseur <strong>${name}</strong> wurde angelegt.`;
        await sendmail({ subject, body });
    }

    async #validateUpdate(id: number, versionStr: string) {
        this.#logger.debug('validateUpdate: id=%s, version=%s', id, versionStr);
        if (!FilmWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidError(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const filmDb = await this.#readService.findById({ id });

        if (version < filmDb.version) {
            this.#logger.warn('validateUpdate: version %d is too old', version);
            throw new VersionOutdatedError(version);
        }
    }
}

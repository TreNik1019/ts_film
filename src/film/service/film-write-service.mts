import { prismaClient } from '../../config/prisma-client.mts';
import { FilmFile, type Prisma } from '../../generated/prisma/client.ts';
import { getLogger } from '../../logger/logger.mts';
import { sendmail } from '../../mail/sendmail.mts';
import {
    BadRequestError,
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

type FilmFileCreate = Prisma.FilmFileUncheckedCreateInput;
export type FilmFileCreated = Prisma.FilmFileGetPayload<{}>;

export class FilmWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;
    private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    readonly #readService: FilmService;

    readonly #logger = getLogger(FilmWriteService.name);

    constructor(readService: FilmService) {
        this.#readService = readService;
    }

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

    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);

        const film = await prismaClient.film.findUnique({
            where: { id },
        });
        if (film === null) {
            this.#logger.warn('delete: no film found with id %d', id);
            return false;
        }

        await prismaClient.$transaction(async (tx) => {
            await tx.film.delete({
                where: { id },
            });
        });
        this.#logger.debug('delete: film with id %d deleted', id);
        return true;
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

    async addFile(
        filmId: number,
        data: Buffer,
        name: string,
        size: number,
        type: string,
    ): Promise<Readonly<FilmFile> | undefined> {
        this.#logger.debug(
            'addFile: filmId=%d, filename=%s, size=%d',
            filmId,
            name,
            size,
        );

        if (size > FilmWriteService.MAX_FILE_SIZE) {
            this.#logger.warn(
                'Die Dateigröße %d überschreitet die maximal erlaubte Größe von %d Bytes',
                size,
                FilmWriteService.MAX_FILE_SIZE,
            );
            throw new BadRequestError(
                `Die Dateigröße überschreitet die maximal erlaubte Größe von ${FilmWriteService.MAX_FILE_SIZE} Bytes.`,
            );
        }

        let filmFileCreated: FilmFileCreated | undefined;
        await prismaClient.$transaction(async (tx) => {
            const film = await tx.film.findUnique({
                where: { id: filmId },
            });
            if (film === null) {
                this.#logger.warn('Es gibt keinen Film mit der ID %d', filmId);
                throw new NotFoundError(
                    `Es gibt keinen Film mit der ID ${filmId}.`,
                );
            }

            await tx.filmFile.deleteMany({ where: { filmId } });

            const filmFile: FilmFileCreate = {
                filename: name,
                data: data as Uint8Array<ArrayBuffer>,
                mimetype: type,
                filmId,
            };
            filmFileCreated = await tx.filmFile.create({
                data: filmFile,
            });
        });

        this.#logger.debug(
            'addFile: id=%s, filename=%s, size=%s, mimetype=%s',
            filmFileCreated?.id,
            filmFileCreated?.filename,
            filmFileCreated?.data.length,
            filmFileCreated?.mimetype,
        );

        return filmFileCreated;
    }
}

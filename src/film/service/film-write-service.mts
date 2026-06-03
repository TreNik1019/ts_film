import { prismaClient } from '../../config/prisma-client.mts';
import { type Prisma } from '../../generated/prisma/client.ts';
import { getLogger } from '../../logger/logger.mts';
import { sendmail } from '../../mail/sendmail.mts';

export type FilmCreate = Prisma.FilmCreateInput;
type FilmCreated = Prisma.FilmGetPayload<{
    include: {
        regisseur: true;
        cover: true;
    };
}>;

export class FilmWriteService {
    readonly #logger = getLogger(FilmWriteService.name);

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

    async #sendmail({ id, name }: { id: number | 'N/A'; name: string }) {
        const subject = `Neuer Film mit ID ${id}`;
        const body = `Ein neuer Film von dem Regisseur <strong>${name}</strong> wurde angelegt.`;
        await sendmail({ subject, body });
    }
}

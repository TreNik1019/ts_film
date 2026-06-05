import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { Filmart, Genres } from '../../generated/prisma/enums.ts';
import { FilmService } from './film-service.mts';
import { type FilmCreate, FilmWriteService } from './film-write-service.mts';

// Hoisting: wird an den (Datei-) Anfang verschoben
const { createMock, countMock, transactionMock, sendmailMock } = vi.hoisted(
    () => {
        return {
            createMock: vi.fn<Prisma.FilmDelegate['create']>(),
            countMock: vi.fn<Prisma.FilmDelegate['count']>(),
            transactionMock: vi.fn(),
            sendmailMock: vi.fn(),
        };
    },
);

// vi.mock() bewirkt Hoisting
vi.mock(import('../../config/prisma-client.mts'), () => {
    return {
        prismaClient: {
            film: {
                create: createMock,
                count: countMock,
            },
            $transaction: transactionMock,
        } as unknown as PrismaClient,
    };
});

vi.mock(import('../../mail/sendmail.mts'), () => {
    return {
        sendmail: sendmailMock,
    };
});

describe('FilmWriteService create', () => {
    let service: FilmWriteService;
    let readService: FilmService;

    beforeEach(() => {
        readService = new FilmService();
        service = new FilmWriteService(readService);

        createMock.mockReset();
        countMock.mockReset();
        transactionMock.mockReset();
        sendmailMock.mockReset();

        transactionMock.mockImplementation(
            async (
                transactionBody: (
                    tx: Prisma.TransactionClient,
                ) => Promise<unknown>,
            ) =>
                await transactionBody({
                    film: {
                        create: createMock,
                        count: countMock,
                    },
                } as unknown as Prisma.TransactionClient),
        );
    });

    test('Neues Film', async () => {
        // given
        const idMock = 1;
        const film: FilmCreate = {
            titel: 'Der Titel',
            art: Filmart.K,
            erscheinungsdatum: new Date('2000-01-01'),
            genre: Genres.Action,
            rating: 1,
            verfuegbar: true,
            preis: new Prisma.Decimal(1.1),
            schlagwoerter: ['SPANNEND'],
            regisseur: {
                create: {
                    name: 'Max Mustermann',
                    geburtsjahr: 1970,
                },
            },
        };
        const filmTmp: any = { ...film };
        filmTmp.id = idMock;
        filmTmp.regisseur.create.id = 11;
        filmTmp.regisseur.create.filmId = idMock;
        // return von tx.film.create()
        createMock.mockResolvedValue(filmTmp);
        // sendmail ist eine void-Funktion
        sendmailMock.mockResolvedValue(null);

        // when
        const id = await service.create(film);

        // then
        expect(id).toBe(idMock);
        expect(sendmailMock).toHaveBeenCalledOnce();
    });
});

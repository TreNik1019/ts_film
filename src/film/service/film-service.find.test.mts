import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { Filmart } from '../../generated/prisma/enums.ts';
import { type FilmMitRegisseurUndCover, FilmService } from './film-service.mts';
import { type Pageable } from './pageable.mts';
import { type Suchparameter } from './suchparameter.mts';

const { findManyMock, countMock } = vi.hoisted(() => ({
    findManyMock: vi.fn<PrismaClient['film']['findMany']>(),
    countMock: vi.fn<PrismaClient['film']['count']>(),
}));

vi.mock('../../config/prisma-client.mts', () => ({
    prismaClient: {
        film: {
            findMany: findManyMock,
            count: countMock,
        },
    },
}));

describe('FilmService - find', () => {
    let service: FilmService;

    beforeEach(() => {
        service = new FilmService();
        findManyMock.mockReset();
        countMock.mockReset();
    });

    test('regisseur vorhanden', async () => {
        // given
        const regisseur = 'Regisseur';
        const suchparameter: Suchparameter = { regisseur };
        const pageable: Pageable = { number: 1, size: 5 };
        const buchMock: FilmMitRegisseurUndCover = {
            id: 1,
            version: 0,
            titel: 'Inception',
            art: Filmart.BlueRay,
            erscheinungsdatum: new Date('2010-07-16'),
            genre: 'ScienceFiction',
            rating: new Prisma.Decimal(5.0),
            verfuegbar: true,
            preis: new Prisma.Decimal(24.99),
            schlagwoerter: ['AUFREGEND', 'SPANNEND'],
            erzeugt: new Date(),
            aktualisiert: new Date(),
            regisseur: {
                id: 1,
                name: 'Christopher Nolan',
                geburtsjahr: 1970,
                filmId: 1,
            },
            cover: [],
        };
        findManyMock.mockResolvedValueOnce([buchMock]);
        countMock.mockResolvedValueOnce(1);

        // when
        const result = await service.find(suchparameter, pageable);

        // then
        const { content } = result;

        expect(content).toHaveLength(1);
        expect(content[0]).toStrictEqual(buchMock);
    });

    test('regisseur nicht vorhanden', async () => {
        // given
        const regisseur = 'Unbekannter Regisseur';
        const suchparameter: Suchparameter = { regisseur };
        const pageable: Pageable = { number: 1, size: 5 };
        findManyMock.mockResolvedValue([]);

        await expect(service.find(suchparameter, pageable)).rejects.toThrow(
            /^Keine Filme gefunden/,
        );
    });
});

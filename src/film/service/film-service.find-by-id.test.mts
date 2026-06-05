import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { Filmart } from '../../generated/prisma/enums.ts';
import { type FilmMitRegisseurUndCover, FilmService } from './film-service.mts';

const { findUniqueMock } = vi.hoisted(() => ({
    findUniqueMock: vi.fn<PrismaClient['film']['findUnique']>(),
}));

vi.mock('../../config/prisma-client.mts', () => ({
    prismaClient: {
        film: {
            findUnique: findUniqueMock,
        },
    },
}));

describe('FilmService - findById', () => {
    let service: FilmService;

    beforeEach(() => {
        service = new FilmService();
        findUniqueMock.mockReset();
    });

    test('Id vorhanden', async () => {
        // given
        const id = 1;
        const filmMock: FilmMitRegisseurUndCover = {
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
        findUniqueMock.mockResolvedValueOnce(filmMock);

        // when
        const result = await service.findById({ id });

        // then
        expect(result).toStrictEqual(filmMock);
    });

    test('Id nicht vorhanden', async () => {
        // given
        const id = 999;
        findUniqueMock.mockResolvedValue(null);

        // when & then
        await expect(service.findById({ id })).rejects.toThrow(
            `Es gibt keine Filme mit der angegebenen ID ${id}.`,
        );
    });
});

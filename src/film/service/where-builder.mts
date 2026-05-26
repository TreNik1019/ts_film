import { type Filmart, Genres, Prisma } from '../../generated/prisma/client.ts';
import { type FilmWhereInput } from '../../generated/prisma/models/Film.ts';
import { getLogger } from '../../logger/logger.mts';
import { type Suchparameter } from './suchparameter.mts';

const buildSchlagwoerter = ({
    aufregend,
    gruselig,
    lustig,
    romantisch,
    spannend,
    traurig,
}: {
        aufregend: string | undefined;
        gruselig: string | undefined;
        lustig: string | undefined;
        romantisch: string | undefined;
        spannend: string | undefined;
        traurig: string | undefined;
}): ReadonlyArray<string> => {
    const schlagwoerter: string[] = [];
    if (aufregend?.toLowerCase() === 'true') {
        schlagwoerter.push('AUFREGEND');
    }
    if (gruselig?.toLowerCase() === 'true') {
        schlagwoerter.push('GRUSELIG');
    }
    if (lustig?.toLowerCase() === 'true') {
        schlagwoerter.push('LUSTIG');
    }
    if (romantisch?.toLowerCase() === 'true') {
        schlagwoerter.push('ROMANTISCH');
    }
    if (spannend?.toLowerCase() === 'true') {
        schlagwoerter.push('SPANNEND');
    }
    if (traurig?.toLowerCase() === 'true') {
        schlagwoerter.push('TRAURIG');
    }
    return schlagwoerter;
};

export type BuildIdParams = {
    readonly id: number;
    readonly mitCover?: boolean;
}

const logger = getLogger('buildWhere', 'function');

export const buildWhere = ({
    aufregend,
    gruselig,
    lustig,
    romantisch,
    spannend,
    traurig,
    ...restProps
}: Suchparameter) => {
    logger.debug(
        'buildWhere: aufregend=%s, gruselig=%s, lustig=%s, romantisch=%s, spannend=%s, traurig=%s',
        aufregend,
        gruselig,
        lustig,
        romantisch,
        spannend,
        traurig,
        restProps,
    );

    let where: FilmWhereInput = {};

    Object.entries(restProps).forEach(([key, value]) => {
        switch (key) {
            case 'regisseur':
                where.regisseur = {
                    name: {
                        contains: value as string,
                        mode: Prisma.QueryMode.insensitive,
                    },
                };
                break;
            case 'titel':
                where.titel = { equals: value as string };
                break;
            case 'art':
                where.art = { equals: value as Filmart };
                break;
            case 'erscheinungsDatum':
                where.erscheinungsdatum = {
                    gte: new Date(value as string),
                };
                break;
            case 'genre':
                where.genre = { equals: value as Genres };
                break;
            case 'rating': {
                const ratingNumber = Number.parseInt(value as string);
                if (!Number.isNaN(ratingNumber)) {
                    where.rating = { gte: ratingNumber };
                }
                break;
            }
            case 'verfuegbar':
                where.verfuegbar = {
                    equals: (value as string).toLowerCase() === 'true',
                };
                break;
            case 'preis': {
                const preisNumber = Number.parseInt(value as string);
                if (!Number.isNaN(preisNumber)) {
                    where.preis = { lte: preisNumber };
                }
                break;
            }
        }
    });

    const schlagwoerter = buildSchlagwoerter({
        aufregend,
        gruselig,
        lustig,
        romantisch,
        spannend,
        traurig,
    });
    if (schlagwoerter.length > 0) {
        where.schlagwoerter = { array_contains: schlagwoerter };
    }

    logger.debug('buildWhere: where=%o', where);
    return where;
}

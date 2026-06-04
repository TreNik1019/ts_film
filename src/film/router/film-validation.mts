import { z } from 'zod';

export const MAX_RATING = 5;

const FilmComplete = z.strictObject({
    // bei GraphQL ist der Typ ID i.a. ein String
    id: z.union([z.number().int().gt(0), z.string().regex(/^[1-9]\d*$/u)]),
    version: z.int().gte(0),
    titel: z.string().min(1),
    art: z.enum(['DVD', 'BlueRay', '4K']).optional(),
    erscheinungsdatum: z.coerce.date(),
    genre: z.enum([
        'Action',
        'Drama',
        'Thriller',
        'Musical',
        'ScienceFiction',
        'Biografie',
    ]),
    rating: z.number().gte(0).lte(MAX_RATING),
    verfuegbar: z.boolean(),
    preis: z.number().gte(0),

    schlagwoerter: z.array(z.string()).optional(),

    regisseur: z.strictObject({
        name: z.string().min(1).max(40),
        geburtsjahr: z.number().int().gte(1).lte(new Date().getFullYear()),
    }),
    cover: z
        .array(
            z.strictObject({
                info: z.string().max(32),
                contentType: z.string().max(16),
            }),
        )
        .optional(),
});
export const FilmNeuSchema = FilmComplete.omit({
    id: true,
    version: true,
}).readonly();

export const FilmUpdateSchema = FilmComplete.omit({
    id: true,
    version: true,
    regisseur: true,
    cover: true,
}).readonly();

export const FilmUpdateGraphQLSchema = FilmComplete.omit({
    regisseur: true,
    cover: true,
}).readonly();

export type FilmNeuType = z.infer<typeof FilmNeuSchema>;
export type FilmUpdateType = z.infer<typeof FilmUpdateSchema>;

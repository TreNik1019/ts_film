import { type Filmart, type Genres } from '../../generated/prisma/enums.js';

// Typdefinition für `find`
export type Suchparameter = {
    readonly titel?: string;
    readonly art?: Filmart;
    readonly erscheinungsDatum?: string;
    readonly genre?: Genres;
    readonly rating?: number;
    readonly verfuegbar?: boolean;
    readonly preis?: number;
    readonly aufregend?: string;
    readonly gruselig?: string;
    readonly lustig?: string;
    readonly romantisch?: string;
    readonly spannend?: string;
    readonly traurig?: string;
    readonly regisseur?: string;
};

// gueltige Namen fuer die Suchparameter
export const suchparameterNamen = [
    'titel',
    'art',
    'erscheinungsDatum',
    'genre',
    'rating',
    'verfuegbar',
    'preis',
    'schlagwoerter',
    'regisseur',
];

import { DbPopulateService } from './config/dev/db-populate.mts';
import { FilmService } from './film/service/film-service.mts';

// TODO: Security und Schreiben von Daten zufügen
const filmService = new FilmService();

export const container = {
    filmService,
    dbPopulateService: new DbPopulateService(),
};

import { DbPopulateService } from './config/dev/db-populate.mts';
import { FilmService } from './film/service/film-service.mts';
import { FilmWriteService } from './film/service/film-write-service.mts';
import { KeycloakService } from './security/keycloak-service.mts';

// TODO: Security und Schreiben von Daten zufügen
const filmService = new FilmService();
export const container = {
    filmService,
    keycloakService: new KeycloakService(),
    filmWriteService: new FilmWriteService(filmService),
    dbPopulateService: new DbPopulateService(),
};

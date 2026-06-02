import { DbPopulateService } from './config/dev/db-populate.mts';
import { FilmService } from './film/service/film-service.mts';
import { KeycloakService } from './security/keycloak-service.mts';

// TODO: Security und Schreiben von Daten zufügen
const filmService = new FilmService();
export const container = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    keycloakService: new KeycloakService(),
    filmService,
    dbPopulateService: new DbPopulateService(),
};

-- Aufruf:
-- docker compose exec db bash
-- psql --dbname=film --username=film --file=/sql/drop-table-film.sql

set search_path to 'film';

DROP TABLE IF EXISTS film_file CASCADE;
DROP TABLE IF EXISTS cover CASCADE;
DROP TABLE IF EXISTS regisseur CASCADE;
DROP TABLE IF EXISTS film CASCADE;

DROP TYPE IF EXISTS filmart;
DROP TYPE IF EXISTS genres;
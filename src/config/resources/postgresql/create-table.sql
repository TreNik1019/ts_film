-- Aufruf:
-- docker compose exec db bash
-- psql --dbname=film --username=film --file=/sql/create-table.sql

-- text statt varchar(n):
-- "There is no performance difference among these three types, apart from a few extra CPU cycles
-- to check the length when storing into a length-constrained column"
-- ggf. CHECK(char_length(nachname) <= 255)

-- Indexe auflisten:
-- psql --dbname=film --username=film
--  SELECT   tablename, indexname, indexdef, tablespace
--  FROM     pg_indexes
--  WHERE    schemaname = 'film'
--  ORDER BY tablename, indexname;
--  \q

SET default_tablespace = filmspace;

CREATE SCHEMA IF NOT EXISTS AUTHORIZATION film;

ALTER ROLE film SET search_path = 'film';
set search_path to 'film';

CREATE TYPE filmart AS ENUM ('DVD', 'BlueRay', '4K');

CREATE TYPE genres AS ENUM ('Action', 'Drama', 'Thriller', 'Musical', 'ScienceFiction', 'Biografie');

CREATE TABLE IF NOT EXISTS film (
    id                  integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    version             integer NOT NULL DEFAULT 0,
    titel               text NOT NULL,
    art                 filmart,
    erscheinungsdatum   date NOT NULL,
    genre               genres NOT NULL,
    rating              decimal(3,1) NOT NULL CHECK(rating >= 0.0 AND rating <= 10.0),
    verfuegbar          boolean NOT NULL DEFAULT FALSE,
    preis               decimal(5,2) NOT NULL CHECK(preis > 0.0),
    schlagwoerter       jsonb,
    erzeugt             timestamp NOT NULL DEFAULT NOW(),
    aktualisiert        timestamp NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS regisseur (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    name            text NOT NULL,
    geburtsjahr     integer CHECK(geburtsjahr > 0 AND geburtsjahr <= EXTRACT(YEAR FROM CURRENT_DATE)),
    film_id         integer NOT NULL UNIQUE REFERENCES film ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS regisseur_film_id_idx ON regisseur(film_id);

CREATE TABLE IF NOT EXISTS cover (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    info            text NOT NULL,
    contentType     text NOT NULL,
    film_id         integer NOT NULL REFERENCES film ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cover_film_id_idx ON cover(film_id);

CREATE TABLE IF NOT EXISTS film_file (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    data            bytea NOT NULL,
    filename        text NOT NULL,
    mimetype        text,
    film_id         integer NOT NULL REFERENCES film ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS film_file_film_id_idx ON film_file(film_id);
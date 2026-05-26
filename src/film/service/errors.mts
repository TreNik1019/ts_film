export class NotFoundError extends Error {}

export class IsbnExistsError extends Error {
    readonly isbn: string | undefined;

    constructor(isbn: string | undefined) {
        super(`Die ISBN-Nummer ${isbn} existiert bereits.`);
        this.isbn = isbn;
    }
}

export class VersionInvalidError extends Error {
    readonly version: string | undefined;

    constructor(version: string | undefined) {
        super(`Die Versionsnummer ${version} ist ungueltig.`);
        this.version = version;
    }
}

export class VersionOutdatedError extends Error {
    readonly version: number;

    constructor(version: number) {
        super(`Die Versionsnummer ${version} ist nicht aktuell.`);
        this.version = version;
    }
}

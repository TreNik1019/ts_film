/**
 * Das Modul besteht aus der asynchronen Funktion {@linkcode sendmail}
 * zum Versenden von Benachrichtigungs-E-Mails.
 * @packageDocumentation
 */

import { type SendMailOptions, createTransport } from 'nodemailer';
import { mailConfig } from '../config/mail.mts';
import { getLogger } from '../logger/logger.mts';

/** Parameter für den Versand einer E-Mail. */
export type SendMailParams = {
    /** Subject für die Email. */
    readonly subject: string;
    /** Body für die Email. */
    readonly body: string;
};

const logger = getLogger('sendmail', 'func');

const { activated, from, to } = mailConfig;
/**
 * Sendet eine E-Mail mit Betreff und Inhalt.
 * @param subject Betreff der E-Mail.
 * @param body Inhalt der E-Mail.
 * @returns Promise<void>
 */
export const sendmail = async ({ subject, body }: SendMailParams) => {
    if (!activated) {
        logger.warn('Mail deaktiviert');
        return;
    }

    const mailOptions: SendMailOptions = { from, to, subject, html: body };
    logger.debug('mailOptions=%o', mailOptions);

    try {
        await createTransport(mailConfig.options).sendMail(mailOptions); // NOSONAR
    } catch (err) {
        logger.warn('Fehler %o', err as object);
    }
};

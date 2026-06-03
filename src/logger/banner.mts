import Bun from 'bun';
import figlet from 'figlet';
import { release, type, userInfo } from 'node:os';
import process from 'node:process';
import { serverConfig } from '../config/server.mts';
import { getLogger } from './logger.mts';

const logger = getLogger('banner', 'func');

export const banner = async () => {
    const { host, nodeEnv, port, portHttp } = serverConfig;

    console.log();
    const text = await figlet.text('film 2026.05.24');
    console.log(text);

    console.log(`  ➜  Local:  http://localhost:${port}`);
    console.log();

    const isContainer = /[0-9a-f]{12}/u.exec(host) ?? false;

    logger.info('Bun: %s', Bun.version);
    logger.info('Bun / Node: %s', process.version);
    logger.info('NODE_ENV: %s', nodeEnv ?? 'undefined');
    logger.info('Rechnername: %s', host);
    logger.info('Port: %d', port);
    logger.info('HTTP-Port: %d', portHttp);
    logger.info('Betriebssystem: %s (%s)', type(), release());
    logger.info('Username: %s', userInfo().username);
    logger.info('Docker Container: %s', isContainer);
    if (isContainer) {
        logger.debug('!!! Container: Bruno nicht nutzbar mit Tokens !!!');
    }
};

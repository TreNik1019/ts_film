import process from 'node:process';
import { defineConfig } from 'vitest/config';

// selbst-signiertes Zertifikat
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',

                    include: ['src/*/service/*.test.mts'],

                    bail: 1,

                    testTimeout: 1_000,
                },
            },
            {
                test: {
                    name: 'integration',
                    include: [
                        'test/integration/*.test.mts',
                        'test/integration/*/*.test.mts',
                    ],

                    globalSetup: './test/integration/setup.global.mts',

                    testTimeout: 2_000,
                },
            },
        ],

        ui: true,
        api: 3001,

        bail: 1,
    },
});

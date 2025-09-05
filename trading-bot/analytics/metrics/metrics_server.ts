import express from 'express';
import { Logger } from '../../infrastructure/logging/logger';
import { MetricsExporter } from './metrics_exporter';
import { Server } from 'http';

export class MetricsServer {
    private readonly app: express.Application;
    private readonly port: number;
    private readonly logger: Logger;
    private readonly metricsExporter: MetricsExporter;
    private server: Server | null = null;

    constructor(
        port: number = 9090,
        logger: Logger
    ) {
        this.port = port;
        this.logger = logger;
        this.app = express();
        this.metricsExporter = new MetricsExporter(logger);

        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Endpoint zdrowia
        this.app.get('/health', (_, res) => {
            res.status(200).send('OK');
        });

        // Endpoint metryki
        this.app.get('/metrics', async (_, res) => {
            try {
                const metrics = await this.metricsExporter.getMetrics();
                res.set('Content-Type', 'text/plain');
                res.send(metrics);
            } catch (error) {
                this.logger.error('Błąd podczas pobierania metryk', error);
                res.status(500).send('Internal Server Error');
            }
        });
    }

    start(): void {
        this.server = this.app.listen(this.port, () => {
            this.logger.info(`[MetricsServer] Serwer uruchomiony na porcie ${this.port}`);
        });
    }

    stop(callback?: () => void): void {
        if (this.server) {
            this.server.close(() => {
                this.logger.info('[MetricsServer] Serwer został zatrzymany');
                if (callback) {
                    callback();
                }
            });
            this.server = null;
        } else if (callback) {
            callback();
        }
    }

    getMetricsExporter(): MetricsExporter {
        return this.metricsExporter;
    }
} 
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsServer = void 0;
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
const express_1 = __importDefault(require("express"));
const metrics_exporter_1 = require("./metrics_exporter");
class MetricsServer {
    constructor(port = 9090, logger) {
        this.server = null;
        this.port = port;
        this.logger = logger;
        this.app = (0, express_1.default)();
        this.metricsExporter = new metrics_exporter_1.MetricsExporter(logger);
        this.setupRoutes();
    }
    setupRoutes() {
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
            }
            catch (error) {
                this.logger.error('Błąd podczas pobierania metryk', error);
                res.status(500).send('Internal Server Error');
            }
        });
    }
    start() {
        this.server = this.app.listen(this.port, () => {
            this.logger.info(`[MetricsServer] Serwer uruchomiony na porcie ${this.port}`);
        });
    }
    stop(callback) {
        if (this.server) {
            this.server.close(() => {
                this.logger.info('[MetricsServer] Serwer został zatrzymany');
                if (callback) {
                    callback();
                }
            });
            this.server = null;
        }
        else if (callback) {
            callback();
        }
    }
    getMetricsExporter() {
        return this.metricsExporter;
    }
}
exports.MetricsServer = MetricsServer;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardWebSocketServer = void 0;
class DashboardWebSocketServer {
    constructor(port = 0) { this.port = port; }
    async getStatistics() { return { clients: 0 }; }
    async getConnectedClients() { return []; }
}
exports.DashboardWebSocketServer = DashboardWebSocketServer;
exports.default = DashboardWebSocketServer;

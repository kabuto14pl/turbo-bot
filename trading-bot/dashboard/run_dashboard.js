"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dashboard_api_1 = require("./dashboard_api");
const dashboard_manager_1 = require("./dashboard_manager");
const ws_stub_1 = __importDefault(require("./ws_stub"));
async function run() {
    const manager = new dashboard_manager_1.AdvancedDashboardManager();
    const ws = new ws_stub_1.default(0);
    const api = new dashboard_api_1.DashboardAPI(manager, ws, { port: 3002, apiPrefix: '/api' });
    await api.start();
    console.log('Dashboard API running. Press Ctrl+C to stop.');
    process.on('SIGINT', async () => {
        console.log('Stopping...');
        await api.stop();
        process.exit(0);
    });
}
run().catch(err => { console.error('Failed to start dashboard', err); process.exit(1); });

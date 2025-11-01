/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import { DashboardAPI } from './dashboard_api';
import { AdvancedDashboardManager } from './dashboard_manager';
import DashboardWebSocketServer from './ws_stub';

async function run() {
  const manager = new AdvancedDashboardManager();
  const ws = new DashboardWebSocketServer(0);

  const api = new DashboardAPI(manager, ws, { port: 3002, apiPrefix: '/api' });

  await api.start();
  console.log('Dashboard API running. Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    console.log('Stopping...');
    await api.stop();
    process.exit(0);
  });
}

run().catch(err => { console.error('Failed to start dashboard', err); process.exit(1); });

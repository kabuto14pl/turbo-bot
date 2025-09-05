/**
 * 🌐 TRADING BOT DASHBOARD API SERVER
 * 
 * Ten plik uruchamia API server dla dashboard'u.
 * Server dostarcza RESTful API oraz WebSocket dla real-time komunikacji.
 * 
 * Port: 9091 (domyślny)
 * Endpoints: /api/*
 * WebSocket: ws://localhost:9091
 */

import { DashboardAPIServer } from './infrastructure/api/dashboard_api_server';
import { Logger } from './infrastructure/logging/logger';

const logger = new Logger();

async function startDashboardAPI(): Promise<void> {
  console.log('🚀 Starting Trading Bot Dashboard API Server...');
  
  try {
    // Create API server
    const apiServer = new DashboardAPIServer({
      port: 9091,
      corsOrigin: [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:3002',
        'http://localhost:5173' // Vite dev server
      ]
    }, logger);

    // Start the server
    await apiServer.start();

    console.log('✅ Dashboard API Server is ready!');
    console.log('📊 Connect your dashboard to: http://localhost:9091/api');
    console.log('🔌 WebSocket available at: ws://localhost:9091');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Dashboard API Server...');
      await apiServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down Dashboard API Server...');
      await apiServer.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Dashboard API Server:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  startDashboardAPI().catch(console.error);
}

export { startDashboardAPI };

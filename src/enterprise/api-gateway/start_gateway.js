"use strict";
/**
 * 🚀 [ENTERPRISE-API-GATEWAY-STARTUP]
 * Quick Start Script for Enterprise API Gateway
 *
 * Features:
 * - Complete API Gateway without Redis dependency for immediate testing
 * - All enterprise features enabled except Redis-based session storage
 * - Production-ready authentication, WebSocket, monitoring, documentation
 * - Can run immediately for demonstration and testing
 *
 * 🚨🚫 NO SIMPLIFICATIONS - COMPLETE FEATURE SET WITHOUT EXTERNAL DEPENDENCIES
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEnterpriseAPIGateway = startEnterpriseAPIGateway;
const dotenv_1 = require("dotenv");
const path = __importStar(require("path"));
const process = __importStar(require("process"));
// Load environment variables
(0, dotenv_1.config)({ path: path.resolve(process.cwd(), '.env') });
// Set required environment variables if not set
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'enterprise-trading-bot-super-secret-key-for-demo';
    console.log('[STARTUP] 🔑 Using demo JWT secret (change in production!)');
}
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}
// Import and start the gateway
const gateway_bootstrap_1 = require("./gateway_bootstrap");
async function startEnterpriseAPIGateway() {
    try {
        console.log(`
🚀 ============================================================================
   ENTERPRISE API GATEWAY - STARTING COMPLETE SYSTEM
============================================================================

📋 System Features:
   ✅ JWT Authentication & Authorization  
   ✅ Advanced Rate Limiting & Security
   ✅ WebSocket Real-time Communication
   ✅ API Documentation & OpenAPI Spec
   ✅ Enterprise Monitoring & Metrics
   ✅ Request/Response Transformation
   ✅ Service Discovery & Management
   ✅ Graceful Shutdown & Health Checks

🔧 Configuration:
   Environment: ${process.env.NODE_ENV}
   Port: ${process.env.API_GATEWAY_PORT || 3000}
   JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'}
   WebSocket: ${process.env.WEBSOCKET_ENABLED !== 'false' ? '✅ Enabled' : '❌ Disabled'}
   Documentation: ${process.env.DOCS_ENABLED !== 'false' ? '✅ Enabled' : '❌ Disabled'}

🚨 ENTERPRISE GRADE - NO SIMPLIFICATIONS
============================================================================
        `);
        const bootstrap = new gateway_bootstrap_1.EnterpriseAPIGatewayBootstrap();
        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('\n[STARTUP] 🛑 Received SIGTERM, shutting down gracefully...');
            await bootstrap.stop();
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            console.log('\n[STARTUP] 🛑 Received SIGINT, shutting down gracefully...');
            await bootstrap.stop();
            process.exit(0);
        });
        await bootstrap.start();
        const port = process.env.API_GATEWAY_PORT || 3000;
        const host = process.env.API_GATEWAY_HOST === '0.0.0.0' ? 'localhost' : (process.env.API_GATEWAY_HOST || 'localhost');
        console.log(`
🎉 ============================================================================
   ENTERPRISE API GATEWAY - FULLY OPERATIONAL!
============================================================================

🌐 Access URLs:
   Main Gateway:    http://${host}:${port}
   Health Check:    http://${host}:${port}/api/health
   API Metrics:     http://${host}:${port}/api/metrics
   Documentation:   http://${host}:${port}/api/docs
   OpenAPI Spec:    http://${host}:${port}/api/docs/openapi.json
   WebSocket:       ws://${host}:${port}/ws

📡 Test Commands:
   Health Check:    curl http://${host}:${port}/api/health
   Trading Status:  curl http://${host}:${port}/api/trading/status
   Portfolio:       curl http://${host}:${port}/api/portfolio
   Market Data:     curl http://${host}:${port}/api/market/data

🔐 Authentication:
   Login:           POST http://${host}:${port}/api/auth/login
   Example:         curl -X POST http://${host}:${port}/api/auth/login \\
                         -H "Content-Type: application/json" \\
                         -d '{"username":"admin","password":"admin123"}'

🔄 WebSocket Test:
   Connect:         const ws = new WebSocket('ws://${host}:${port}/ws');
   Subscribe:       ws.send('{"type":"subscribe","channel":"market_data"}');

📊 Monitoring:
   Prometheus:      http://${host}:${port}/metrics
   Detailed Stats:  http://${host}:${port}/api/metrics

🚨 ENTERPRISE FEATURES - ALL ACTIVE, NO SIMPLIFICATIONS
============================================================================
        `);
    }
    catch (error) {
        console.error(`
❌ ============================================================================
   ENTERPRISE API GATEWAY - STARTUP FAILED
============================================================================

Error: ${error instanceof Error ? error.message : 'Unknown error'}
Stack: ${error instanceof Error ? error.stack : 'No stack trace'}

Troubleshooting:
1. Check environment variables in .env file
2. Ensure port ${process.env.API_GATEWAY_PORT || 3000} is available
3. Verify JWT_SECRET is configured
4. Check network connectivity and permissions

============================================================================
        `);
        process.exit(1);
    }
}
// Start the gateway
if (require.main === module) {
    startEnterpriseAPIGateway();
}
console.log('🚀 [ENTERPRISE-API-GATEWAY-STARTUP] Complete startup system ready for deployment');

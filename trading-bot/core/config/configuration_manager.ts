/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * ⚙️ SIMPLE CONFIGURATION MANAGER
 * Lightweight configuration for modular architecture
 */

export interface AppConfig {
  environment: string;
  version: string;
  port: number;
  host: string;
  isCodespace: boolean;
  cache: {
    enabled: boolean;
    ttl: number;
  };
  monitoring: {
    enabled: boolean;
    port: number;
  };
  ml: {
    enabled: boolean;
  };
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigurationManager {
    if (!this.instance) {
      this.instance = new ConfigurationManager();
    }
    return this.instance;
  }

  private loadConfig(): AppConfig {
    const env = process.env;
    return {
      environment: env.NODE_ENV || 'development',
      version: '4.0.4',
      port: parseInt(env.PORT || '3000'),
      host: env.HOST || (env.CODESPACES ? '0.0.0.0' : 'localhost'),
      isCodespace: !!env.CODESPACES,
      cache: {
        enabled: env.CACHE_ENABLED !== 'false',
        ttl: parseInt(env.CACHE_TTL || '3600')
      },
      monitoring: {
        enabled: env.MONITORING_ENABLED !== 'false',
        port: parseInt(env.MONITORING_PORT || '9090')
      },
      ml: {
        enabled: env.ML_ENABLED !== 'false'
      }
    };
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }
}

/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 📦 DEPENDENCY INJECTION CONTAINER
 * Enterprise-grade IoC container for managing application dependencies
 * Supports singleton, transient, and scoped lifetimes
 */

export interface ServiceDescriptor {
  lifetime: 'singleton' | 'transient' | 'scoped';
  factory?: () => any;
  instance?: any;
}

/**
 * Lightweight dependency injection container
 */
export class DependencyContainer {
  private services = new Map<string, ServiceDescriptor>();
  private singletons = new Map<string, any>();

  /**
   * Register a service with the container
   */
  register<T>(
    key: string, 
    instanceOrFactory: T | (() => T), 
    lifetime: 'singleton' | 'transient' | 'scoped' = 'singleton'
  ): void {
    if (typeof instanceOrFactory === 'function') {
      this.services.set(key, {
        lifetime,
        factory: instanceOrFactory as () => T
      });
    } else {
      this.services.set(key, {
        lifetime: 'singleton',
        instance: instanceOrFactory
      });
      
      if (lifetime === 'singleton') {
        this.singletons.set(key, instanceOrFactory);
      }
    }
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(key: string): T {
    const service = this.services.get(key);
    
    if (!service) {
      throw new Error(`Service '${key}' not found in container`);
    }

    // Return existing instance for registered instances
    if (service.instance !== undefined) {
      return service.instance;
    }

    // Handle singleton lifetime
    if (service.lifetime === 'singleton') {
      if (this.singletons.has(key)) {
        return this.singletons.get(key);
      }
      
      if (service.factory) {
        const instance = service.factory();
        this.singletons.set(key, instance);
        return instance;
      }
    }

    // Handle transient lifetime
    if (service.lifetime === 'transient' && service.factory) {
      return service.factory();
    }

    throw new Error(`Unable to resolve service '${key}'`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Get all registered service keys
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}

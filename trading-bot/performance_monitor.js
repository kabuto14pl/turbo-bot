/**
 * 📊 PERFORMANCE MONITOR
 * Narzędzie do monitorowania CPU i RAM w czasie rzeczywistym
 */

const os = require('os');
const process = require('process');

class PerformanceMonitor {
  constructor() {
    this.isRunning = false;
    this.stats = {
      cpu: [],
      memory: [],
      timestamps: []
    };
  }

  start() {
    console.log('🔍 Starting Performance Monitor...');
    console.log(`💻 Hardware: ${os.cpus().length} cores, ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB RAM`);
    
    this.isRunning = true;
    this.monitorLoop();
  }

  async monitorLoop() {
    while (this.isRunning) {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = this.getMemoryUsage();
      const timestamp = new Date();

      // Store stats
      this.stats.cpu.push(cpuUsage);
      this.stats.memory.push(memoryUsage);
      this.stats.timestamps.push(timestamp);

      // Keep only last 60 readings (5 minutes at 5s intervals)
      if (this.stats.cpu.length > 60) {
        this.stats.cpu.shift();
        this.stats.memory.shift();
        this.stats.timestamps.shift();
      }

      // Log current status
      console.log(`📊 [${timestamp.toLocaleTimeString()}] CPU: ${cpuUsage.toFixed(1)}% | RAM: ${memoryUsage.heapUsed}MB | RSS: ${memoryUsage.rss}MB`);

      // Alert on high usage
      if (cpuUsage > 80) {
        console.log('🚨 HIGH CPU USAGE DETECTED!');
      }
      if (memoryUsage.heapUsed > 4000) {
        console.log('🚨 HIGH MEMORY USAGE DETECTED!');
      }

      // Wait 5 seconds
      await this.sleep(5000);
    }
  }

  async getCPUUsage() {
    const startUsage = process.cpuUsage();
    await this.sleep(100);
    const endUsage = process.cpuUsage(startUsage);
    
    const userPercent = (endUsage.user / 1000) / 100 * 100;
    const systemPercent = (endUsage.system / 1000) / 100 * 100;
    
    return userPercent + systemPercent;
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  }

  getReport() {
    if (this.stats.cpu.length === 0) return 'No data collected yet';

    const avgCPU = this.stats.cpu.reduce((a, b) => a + b, 0) / this.stats.cpu.length;
    const maxCPU = Math.max(...this.stats.cpu);
    const avgRAM = this.stats.memory.reduce((a, b) => a + b.heapUsed, 0) / this.stats.memory.length;
    const maxRAM = Math.max(...this.stats.memory.map(m => m.heapUsed));

    return `
📊 PERFORMANCE REPORT
CPU: Avg ${avgCPU.toFixed(1)}% | Max ${maxCPU.toFixed(1)}%
RAM: Avg ${avgRAM.toFixed(0)}MB | Max ${maxRAM}MB
Samples: ${this.stats.cpu.length}
Duration: ${Math.round((Date.now() - this.stats.timestamps[0]) / 1000)}s
    `;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️ Performance Monitor stopped');
    console.log(this.getReport());
  }
}

// Auto-start if run directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.start();

  // Stop on Ctrl+C
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });
}

module.exports = PerformanceMonitor;

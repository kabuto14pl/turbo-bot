import * as module from './src/enterprise/performance/advanced_performance_system';

console.log('Module keys:', Object.keys(module));
console.log('AdvancedPerformanceSystem type:', typeof module.AdvancedPerformanceSystem);
console.log('AdvancedPerformanceSystem exists:', !!module.AdvancedPerformanceSystem);

if (module.AdvancedPerformanceSystem) {
    console.log('✅ AdvancedPerformanceSystem is exportable');
} else {
    console.log('❌ AdvancedPerformanceSystem is NOT exportable');
}
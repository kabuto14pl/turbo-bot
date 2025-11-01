"use strict";
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
exports.demonstrateNewFeatures = demonstrateNewFeatures;
exports.testIntegration = testIntegration;
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
const data_chunker_1 = require("./data_chunker");
const experiment_resumer_1 = require("./experiment_resumer");
const stream_processor_1 = require("./stream_processor");
const experiment_tracker_1 = require("./experiment_tracker");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Demonstracja wszystkich nowych komponentów
 */
async function demonstrateNewFeatures() {
    console.log('🚀 === DEMONSTRACJA NOWYCH KOMPONENTÓW ===\n');
    // ============================================================================
    // 1. CHUNKING DLA DUŻYCH DANYCH
    // ============================================================================
    console.log('📁 === 1. CHUNKING DLA DUŻYCH DANYCH ===');
    const chunker = new data_chunker_1.DataChunker({
        chunkSize: 1024 * 64, // 64KB chunks dla demo
        maxMemoryUsage: 50,
        compressionEnabled: false,
        tempDirectory: path.join(process.cwd(), 'temp', 'demo_chunks')
    });
    // Przykład 1: Chunking dużego pliku CSV
    console.log('\n📊 Test 1: Chunking pliku CSV');
    const csvFile = path.join(process.cwd(), 'BTC_data_1h.csv');
    if (fs.existsSync(csvFile)) {
        try {
            const chunkResult = await chunker.chunkFile(csvFile, 'btc_demo');
            console.log(`✅ Plik podzielony na ${chunkResult.totalChunks} chunków`);
            console.log(`📋 Manifest: ${chunkResult.manifestPath}`);
            // Składanie z powrotem
            const assembledFile = path.join(process.cwd(), 'temp', 'btc_assembled.csv');
            await chunker.assembleChunks(chunkResult.manifestPath, assembledFile);
            console.log(`🔧 Plik składany: ${assembledFile}`);
            // Sprzątanie
            await chunker.cleanupChunks(chunkResult.manifestPath);
            if (fs.existsSync(assembledFile)) {
                fs.unlinkSync(assembledFile);
            }
        }
        catch (error) {
            console.error('❌ Błąd chunking pliku:', error);
        }
    }
    else {
        console.log('⚠️ Plik BTC_data_1h.csv nie istnieje, pomijam test');
    }
    // Przykład 2: Chunking danych JSON
    console.log('\n📋 Test 2: Chunking danych JSON');
    const sampleData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        timestamp: Date.now() + i * 1000,
        price: 50000 + Math.random() * 10000,
        volume: Math.random() * 100,
        metadata: { source: 'demo', batch: Math.floor(i / 100) }
    }));
    try {
        const jsonChunkResult = await chunker.chunkJsonData(sampleData, 'demo_data');
        console.log(`✅ JSON podzielony na ${jsonChunkResult.totalChunks} chunków`);
        // Składanie JSON
        const assembledData = await chunker.assembleJsonChunks(jsonChunkResult.manifestPath);
        console.log(`🔧 JSON składany: ${assembledData.length} elementów`);
        // Sprzątanie
        await chunker.cleanupChunks(jsonChunkResult.manifestPath);
    }
    catch (error) {
        console.error('❌ Błąd chunking JSON:', error);
    }
    // ============================================================================
    // 2. EXPLICIT RESUME API
    // ============================================================================
    console.log('\n🔄 === 2. EXPLICIT RESUME API ===');
    const resumer = new experiment_resumer_1.ExperimentResumer(experiment_tracker_1.experimentTracker, {
        checkpointInterval: 10, // Co 10 sekund dla demo
        maxRetryAttempts: 3,
        autoResumeOnStart: true,
        backupBeforeResume: true
    });
    // Stwórz demo eksperyment
    console.log('\n🧪 Test 1: Tworzenie eksperymentu do wznowienia');
    const experimentId = experiment_tracker_1.experimentTracker.createExperiment({
        name: 'Demo Experiment dla Resume',
        strategyName: 'DemoStrategy',
        description: 'Eksperyment demonstracyjny dla funkcji Resume',
        profile: {
            name: 'demo_profile',
            description: 'Demo profile for resume testing',
            trials: 100,
            walkForward: false,
            walkForwardPeriods: 0,
            primaryMetric: 'sharpe_ratio',
            secondaryMetrics: [],
            saveIntermediateResults: true,
            enableVisualization: true,
            enableCrossValidation: false,
            enableParameterAnalysis: false,
            dataSubsetSize: 1000,
            timeoutMinutes: 5
        },
        tags: ['demo', 'resume-test']
    });
    console.log(`📝 Utworzono eksperyment: ${experimentId}`);
    // Symuluj checkpoint
    console.log('\n💾 Test 2: Zapisywanie checkpoint');
    try {
        await resumer.saveCheckpoint(experimentId, 10, 0.85, { param1: 0.1, param2: 0.3 }, {
            trialCount: 10,
            elapsedTime: 30000,
            metadata: { step: 'initial_phase' }
        });
        console.log('✅ Checkpoint zapisany');
    }
    catch (error) {
        console.error('❌ Błąd checkpoint:', error);
    }
    // Symuluj przerwanie eksperymentu
    console.log('\n⏸️ Test 3: Symulacja przerwania eksperymentu');
    experiment_tracker_1.experimentTracker.updateExperiment(experimentId, { status: 'failed' });
    // Test wznowienia
    console.log('\n🔄 Test 4: Wznowienie eksperymentu');
    try {
        const resumeResult = await resumer.resumeExperiment(experimentId);
        console.log(`✅ Wynik wznowienia:`, resumeResult);
        if (resumeResult.success) {
            // Rozpocznij monitoring
            resumer.startCheckpointMonitoring(experimentId);
            console.log('🔍 Monitoring checkpoint rozpoczęty');
            // Zatrzymaj po chwili
            setTimeout(() => {
                resumer.stopCheckpointMonitoring(experimentId);
                console.log('⏹️ Monitoring checkpoint zatrzymany');
            }, 5000);
        }
    }
    catch (error) {
        console.error('❌ Błąd wznowienia:', error);
    }
    // Test auto-resume
    console.log('\n🤖 Test 5: Auto-resume wszystkich przerwanych eksperymentów');
    try {
        const autoResumeResults = await resumer.autoResumeAll();
        console.log(`🔄 Auto-resume: ${autoResumeResults.length} eksperymentów`);
        autoResumeResults.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.success ? '✅' : '❌'} ${result.message}`);
        });
    }
    catch (error) {
        console.error('❌ Błąd auto-resume:', error);
    }
    // ============================================================================
    // 3. STREAM PROCESSING
    // ============================================================================
    console.log('\n🌊 === 3. STREAM PROCESSING ===');
    // Przykład 1: Podstawowy stream processor
    console.log('\n📡 Test 1: Podstawowy stream processing');
    const processor = stream_processor_1.streamManager.createStream('demo-stream', {
        bufferSize: 50,
        flushInterval: 2000, // 2 sekundy dla demo
        persistToFile: true,
        outputDirectory: path.join(process.cwd(), 'temp', 'demo_streams')
    });
    // Skonfiguruj funkcję przetwarzania
    processor.setProcessFunction(async (item) => {
        // Symuluj przetwarzanie (dodaj timestamp przetwarzania)
        return {
            ...item,
            data: {
                ...item.data,
                processed_at: Date.now(),
                processed: true
            }
        };
    });
    // Event listenery
    processor.on('data', (event) => {
        console.log(`📊 Przetworzono element: ${event.data?.id}`);
    });
    processor.on('flush', (event) => {
        console.log(`💾 Flush: ${event.data?.itemsCount} elementów`);
    });
    processor.on('stats', (event) => {
        const stats = event.stats;
        console.log(`📈 Stats: ${stats?.itemsProcessed} elementów, ${stats?.itemsPerSecond?.toFixed(2)} elem/s`);
    });
    // Uruchom processor
    processor.start();
    // Dodaj dane do strumienia
    console.log('\n📥 Dodawanie danych do strumienia...');
    for (let i = 0; i < 150; i++) {
        await processor.addItem({
            value: Math.random() * 100,
            timestamp: Date.now(),
            index: i
        }, { source: 'demo', batch: Math.floor(i / 50) });
        // Mała pauza dla demonstracji
        if (i % 25 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    // Przykład 2: Stream z transformacjami
    console.log('\n🔄 Test 2: Stream z filtrowaniem i mapowaniem');
    // Filtruj tylko elementy z wartością > 50
    const filteredStream = processor.filter((item) => item.data.value > 50);
    // Mapuj elementy (podwój wartość)
    const mappedStream = filteredStream.map((item) => ({
        ...item,
        data: {
            ...item.data,
            doubled_value: item.data.value * 2
        }
    }));
    mappedStream.on('data', (event) => {
        console.log(`🔢 Przefiltrowano i zmapowano: ${event.data?.data?.value} -> ${event.data?.data?.doubled_value}`);
    });
    // Dodaj więcej danych
    await processor.addBatch(Array.from({ length: 50 }, (_, i) => ({
        value: Math.random() * 100,
        test_index: i
    })), { source: 'batch-demo' });
    // Przykład 3: Statystyki i zarządzanie
    console.log('\n📊 Test 3: Statystyki i zarządzanie streamów');
    setTimeout(async () => {
        // Pokaż statystyki
        const stats = processor.getStats();
        console.log('\n📈 Statystyki stream processora:');
        console.log(`  Elementy przetworzony: ${stats.itemsProcessed}`);
        console.log(`  Elementy/sekundę: ${stats.itemsPerSecond.toFixed(2)}`);
        console.log(`  Średni czas przetwarzania: ${stats.averageProcessingTime.toFixed(2)}ms`);
        console.log(`  Użycie bufora: ${stats.bufferUsage}`);
        console.log(`  Użycie pamięci: ${stats.memoryUsage}MB`);
        console.log(`  Błędy: ${stats.errorsCount}`);
        // Statystyki globalne
        const globalStats = stream_processor_1.streamManager.getGlobalStats();
        console.log('\n🌍 Statystyki globalne:');
        console.log(`  Łączna liczba processorów: ${globalStats.totalProcessors}`);
        console.log(`  Łączne elementy: ${globalStats.totalItemsProcessed}`);
        console.log(`  Łączne błędy: ${globalStats.totalErrors}`);
        console.log(`  Średnia prędkość: ${globalStats.averageItemsPerSecond.toFixed(2)} elem/s`);
        // Zatrzymaj wszystko
        console.log('\n⏹️ Zatrzymywanie streamów...');
        await stream_processor_1.streamManager.stopAll();
        console.log('\n🎉 === DEMONSTRACJA ZAKOŃCZONA ===');
    }, 8000); // 8 sekund na wszystkie operacje
}
/**
 * Funkcja do testowania integracji wszystkich komponentów
 */
async function testIntegration() {
    console.log('\n🔧 === TEST INTEGRACJI KOMPONENTÓW ===');
    try {
        // 1. Użyj chunker do przygotowania danych
        const chunker = new data_chunker_1.DataChunker();
        const testData = Array.from({ length: 500 }, (_, i) => ({
            timestamp: Date.now() + i * 1000,
            price: 50000 + Math.sin(i / 10) * 5000,
            volume: Math.random() * 100,
            optimization_iteration: i
        }));
        const chunkResult = await chunker.chunkJsonData(testData, 'integration_test');
        console.log(`📦 Przygotowano ${chunkResult.totalChunks} chunków danych`);
        // 2. Stwórz eksperyment z resume capability
        const experimentId = experiment_tracker_1.experimentTracker.createExperiment({
            name: 'Integration Test Experiment',
            strategyName: 'IntegrationStrategy',
            profile: {
                name: 'integration_profile',
                description: 'Integration test profile',
                trials: 200,
                walkForward: false,
                walkForwardPeriods: 0,
                primaryMetric: 'total_return',
                secondaryMetrics: [],
                saveIntermediateResults: true,
                enableVisualization: true,
                enableCrossValidation: false,
                enableParameterAnalysis: false,
                dataSubsetSize: 2000,
                timeoutMinutes: 10
            },
            tags: ['integration', 'chunked-data']
        });
        const resumer = new experiment_resumer_1.ExperimentResumer(experiment_tracker_1.experimentTracker);
        // 3. Użyj stream processor do przetwarzania chunków
        const processor = stream_processor_1.streamManager.createStream('integration-stream');
        processor.start();
        processor.setProcessFunction(async (item) => {
            // Symuluj optymalizację każdego elementu
            const optimizationResult = {
                ...item.data,
                optimized: true,
                fitness_score: Math.random() * 2 - 1, // -1 do 1
                processed_time: Date.now()
            };
            // Zapisz checkpoint co 50 elementów
            if (item.data.optimization_iteration % 50 === 0) {
                await resumer.saveCheckpoint(experimentId, item.data.optimization_iteration, optimizationResult.fitness_score, { chunk_index: Math.floor(item.data.optimization_iteration / 50) });
            }
            return {
                ...item,
                data: optimizationResult
            };
        });
        // Załaduj dane z chunków do stream processora
        const assembledData = await chunker.assembleJsonChunks(chunkResult.manifestPath);
        await processor.addBatch(assembledData, { integration_test: true });
        // Czekaj na zakończenie przetwarzania
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 4. Test wznowienia
        experiment_tracker_1.experimentTracker.updateExperiment(experimentId, { status: 'interrupted' });
        const resumeResult = await resumer.resumeExperiment(experimentId);
        console.log(`🔄 Resume test: ${resumeResult.success ? '✅ Sukces' : '❌ Błąd'}`);
        // Sprzątanie
        await processor.cleanup();
        await chunker.cleanupChunks(chunkResult.manifestPath);
        console.log('✅ Test integracji zakończony pomyślnie');
    }
    catch (error) {
        console.error('❌ Błąd testu integracji:', error);
    }
}
// Uruchom demonstrację
if (require.main === module) {
    demonstrateNewFeatures()
        .then(() => testIntegration())
        .catch(error => {
        console.error('❌ Błąd demonstracji:', error);
        process.exit(1);
    });
}

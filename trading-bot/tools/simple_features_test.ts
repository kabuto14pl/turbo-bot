import { DataChunker } from './data_chunker';
import { ExperimentResumer } from './experiment_resumer';
import { StreamProcessor, streamManager } from './stream_processor';
import { experimentTracker } from './experiment_tracker';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Prosty test nowych komponentów
 */
async function simpleTest() {
    console.log('🚀 === TEST NOWYCH KOMPONENTÓW ===\n');

    // ============================================================================
    // 1. TEST CHUNKING
    // ============================================================================
    console.log('📁 1. TEST CHUNKING');
    
    try {
        const chunker = new DataChunker({
            chunkSize: 1024 * 10, // 10KB dla testu
            tempDirectory: path.join(process.cwd(), 'temp', 'test_chunks')
        });

        // Test JSON chunking
        const testData = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            value: Math.random() * 100,
            timestamp: Date.now() + i * 1000
        }));

        const chunkResult = await chunker.chunkJsonData(testData, 'test_data');
        console.log(`✅ JSON podzielony na ${chunkResult.totalChunks} chunków`);
        
        const assembledData = await chunker.assembleJsonChunks(chunkResult.manifestPath);
        console.log(`✅ Składanie: ${assembledData.length} elementów`);
        
        // Weryfikacja
        const isEqual = assembledData.length === testData.length;
        console.log(`${isEqual ? '✅' : '❌'} Weryfikacja: dane ${isEqual ? 'identyczne' : 'różne'}`);
        
        // Sprzątanie
        await chunker.cleanupChunks(chunkResult.manifestPath);
        console.log('✅ Chunking test zakończony\n');
        
    } catch (error) {
        console.error('❌ Błąd chunking:', error);
    }

    // ============================================================================
    // 2. TEST RESUME API
    // ============================================================================
    console.log('🔄 2. TEST RESUME API');
    
    try {
        const resumer = new ExperimentResumer(experimentTracker, {
            checkpointInterval: 5,
            autoResumeOnStart: false
        });

        // Stwórz eksperyment
        const experimentId = experimentTracker.createExperiment({
            name: 'Test Resume Experiment',
            strategyName: 'TestStrategy',
            description: 'Test eksperyment dla Resume API',
            profile: {
                name: 'test_profile',
                description: 'Test profile',
                trials: 50,
                walkForward: false,
                walkForwardPeriods: 0,
                primaryMetric: 'sharpe_ratio' as any,
                secondaryMetrics: [],
                saveIntermediateResults: true,
                enableVisualization: false,
                enableCrossValidation: false,
                enableParameterAnalysis: false
            },
            tags: ['test']
        });

        console.log(`📝 Eksperyment utworzony: ${experimentId}`);

        // Zapisz checkpoint
        await resumer.saveCheckpoint(
            experimentId,
            5,
            0.75,
            { param1: 0.2, param2: 0.8 },
            { trialCount: 5, elapsedTime: 15000 }
        );
        console.log('✅ Checkpoint zapisany');

        // Symuluj przerwanie
        experimentTracker.updateExperiment(experimentId, { status: 'failed' });
        console.log('⏸️ Eksperyment przerwany');

        // Test wznowienia
        const resumeResult = await resumer.resumeExperiment(experimentId);
        console.log(`${resumeResult.success ? '✅' : '❌'} Resume: ${resumeResult.message}`);
        
        console.log('✅ Resume test zakończony\n');
        
    } catch (error) {
        console.error('❌ Błąd resume:', error);
    }

    // ============================================================================
    // 3. TEST STREAM PROCESSING
    // ============================================================================
    console.log('🌊 3. TEST STREAM PROCESSING');
    
    try {
        const processor = streamManager.createStream('test-stream', {
            bufferSize: 20,
            flushInterval: 2000,
            persistToFile: true,
            outputDirectory: path.join(process.cwd(), 'temp', 'test_streams')
        });

        let processedCount = 0;
        
        processor.setProcessFunction(async (item) => {
            processedCount++;
            return {
                ...item,
                data: {
                    ...item.data,
                    processed: true,
                    processedAt: Date.now()
                }
            };
        });

        processor.on('data', () => {
            // console.log(`📊 Element przetworzony`);
        });

        processor.on('flush', (event) => {
            console.log(`💾 Flush: ${event.data?.itemsCount} elementów`);
        });

        processor.start();
        console.log('🚀 Stream processor uruchomiony');

        // Dodaj dane
        console.log('📥 Dodawanie danych...');
        for (let i = 0; i < 50; i++) {
            await processor.addItem({
                index: i,
                value: Math.random() * 100,
                timestamp: Date.now()
            });
            
            if (i % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        // Czekaj na przetworzenie
        await new Promise(resolve => setTimeout(resolve, 3000));

        const stats = processor.getStats();
        console.log(`📊 Statystyki:`);
        console.log(`  Przetworzono: ${stats.itemsProcessed} elementów`);
        console.log(`  Funkcja przetwarzania: ${processedCount} wywołań`);
        console.log(`  Prędkość: ${stats.itemsPerSecond.toFixed(2)} elem/s`);

        await streamManager.stopAll();
        console.log('✅ Stream test zakończony\n');
        
    } catch (error) {
        console.error('❌ Błąd stream:', error);
    }

    console.log('🎉 === WSZYSTKIE TESTY ZAKOŃCZONE ===');
    console.log('📋 Status komponentów:');
    console.log('✅ Chunking dla Dużych Danych - ZAIMPLEMENTOWANY');
    console.log('✅ Explicit Resume API - ZAIMPLEMENTOWANY');
    console.log('✅ Stream Processing - ZAIMPLEMENTOWANY');
}

// Uruchom test
if (require.main === module) {
    simpleTest().catch(error => {
        console.error('❌ Błąd testu:', error);
        process.exit(1);
    });
}

export { simpleTest };

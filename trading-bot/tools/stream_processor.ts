/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Transform, Readable, Writable, pipeline } from 'stream';
import { promisify } from 'util';

/**
 * Interfejs dla elementu w strumieniu danych
 */
export interface StreamDataItem {
    id: string;
    timestamp: number;
    data: any;
    metadata?: Record<string, any>;
}

/**
 * Konfiguracja dla stream processingu
 */
export interface StreamProcessingConfig {
    bufferSize: number;             // Rozmiar bufora w elementach
    flushInterval: number;          // Interwał zapisywania w ms
    maxMemoryUsage: number;         // Maksymalne użycie pamięci w MB
    compressionEnabled: boolean;    // Czy włączyć kompresję
    persistToFile: boolean;         // Czy zapisywać do pliku
    outputDirectory: string;        // Katalog wyjściowy
}

/**
 * Statystyki stream processingu
 */
export interface StreamStats {
    itemsProcessed: number;
    itemsPerSecond: number;
    averageProcessingTime: number;
    bufferUsage: number;
    memoryUsage: number;
    errorsCount: number;
    startTime: number;
    lastUpdateTime: number;
}

/**
 * Event data dla stream events
 */
export interface StreamEvent {
    type: 'data' | 'error' | 'flush' | 'complete' | 'stats';
    data?: any;
    error?: Error;
    stats?: StreamStats;
}

/**
 * Klasa do przetwarzania strumieni danych w czasie rzeczywistym
 */
export class StreamProcessor extends EventEmitter {
    private config: StreamProcessingConfig;
    private buffer: StreamDataItem[] = [];
    private stats: StreamStats;
    private flushTimer?: NodeJS.Timeout;
    private outputFile?: fs.WriteStream;
    private processFunction?: (item: StreamDataItem) => Promise<StreamDataItem | null>;
    private isRunning: boolean = false;
    private sessionId: string;

    constructor(config: Partial<StreamProcessingConfig> = {}) {
        super();
        
        this.config = {
            bufferSize: config.bufferSize || 1000,
            flushInterval: config.flushInterval || 5000, // 5 sekund
            maxMemoryUsage: config.maxMemoryUsage || 100, // 100MB
            compressionEnabled: config.compressionEnabled || false,
            persistToFile: config.persistToFile || true,
            outputDirectory: config.outputDirectory || path.join(process.cwd(), 'temp', 'streams')
        };

        this.sessionId = `stream_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        this.stats = {
            itemsProcessed: 0,
            itemsPerSecond: 0,
            averageProcessingTime: 0,
            bufferUsage: 0,
            memoryUsage: 0,
            errorsCount: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };

        // Utwórz katalog wyjściowy
        if (!fs.existsSync(this.config.outputDirectory)) {
            fs.mkdirSync(this.config.outputDirectory, { recursive: true });
        }

        // Skonfiguruj automatyczne flush
        this.setupAutoFlush();
    }

    /**
     * Uruchamia stream processor
     */
    start(): void {
        if (this.isRunning) {
            console.warn('⚠️ Stream processor już jest uruchomiony');
            return;
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();
        
        // Otwórz plik wyjściowy jeśli potrzeba
        if (this.config.persistToFile) {
            const outputPath = path.join(this.config.outputDirectory, `${this.sessionId}.jsonl`);
            this.outputFile = fs.createWriteStream(outputPath, { flags: 'a' });
            console.log(`📁 Stream wyjściowy: ${outputPath}`);
        }

        console.log(`🚀 Stream processor uruchomiony (session: ${this.sessionId})`);
        this.emit('start', { sessionId: this.sessionId });
    }

    /**
     * Zatrzymuje stream processor
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        // Flush pozostałe dane
        if (this.buffer.length > 0) {
            await this.flushBuffer();
        }

        // Zatrzymaj timer
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }

        // Zamknij plik wyjściowy
        if (this.outputFile) {
            this.outputFile.end();
            this.outputFile = undefined;
        }

        console.log(`⏹️ Stream processor zatrzymany (przetworzono ${this.stats.itemsProcessed} elementów)`);
        this.emit('stop', { stats: this.stats });
    }

    /**
     * Ustawia funkcję przetwarzania danych
     */
    setProcessFunction(fn: (item: StreamDataItem) => Promise<StreamDataItem | null>): void {
        this.processFunction = fn;
        console.log(`🔧 Funkcja przetwarzania ustawiona`);
    }

    /**
     * Dodaje element do strumienia
     */
    async addItem(data: any, metadata?: Record<string, any>): Promise<void> {
        if (!this.isRunning) {
            throw new Error('Stream processor nie jest uruchomiony');
        }

        const item: StreamDataItem = {
            id: `item_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            timestamp: Date.now(),
            data,
            metadata
        };

        try {
            const startTime = Date.now();
            
            // Przetwórz element jeśli jest funkcja
            let processedItem = item;
            if (this.processFunction) {
                const result = await this.processFunction(item);
                if (result === null) {
                    // Element został odfiltrowany
                    return;
                }
                processedItem = result;
            }

            // Dodaj do bufora
            this.buffer.push(processedItem);
            
            // Aktualizuj statystyki
            this.updateStats(Date.now() - startTime);
            
            // Sprawdź czy buffer jest pełny
            if (this.buffer.length >= this.config.bufferSize) {
                await this.flushBuffer();
            }

            // Sprawdź użycie pamięci
            this.checkMemoryUsage();

            // Emituj event
            this.emit('data', { type: 'data', data: processedItem });

        } catch (error) {
            this.stats.errorsCount++;
            this.emit('error', { type: 'error', error: error as Error });
            console.error(`❌ Błąd przetwarzania elementu:`, error);
        }
    }

    /**
     * Dodaje wiele elementów naraz
     */
    async addBatch(items: any[], metadata?: Record<string, any>): Promise<void> {
        console.log(`📦 Dodawanie batch ${items.length} elementów...`);
        
        for (const data of items) {
            await this.addItem(data, metadata);
        }
        
        console.log(`✅ Batch zakończony`);
    }

    /**
     * Tworzy stream transform
     */
    createTransformStream(): Transform {
        return new Transform({
            objectMode: true,
            transform: async (chunk, encoding, callback) => {
                try {
                    await this.addItem(chunk);
                    callback();
                } catch (error) {
                    callback(error instanceof Error ? error : new Error(String(error)));
                }
            }
        });
    }

    /**
     * Tworzy readable stream z bufora
     */
    createReadableStream(): Readable {
        let index = 0;
        const buffer = [...this.buffer];
        
        return new Readable({
            objectMode: true,
            read() {
                if (index < buffer.length) {
                    this.push(buffer[index++]);
                } else {
                    this.push(null); // End of stream
                }
            }
        });
    }

    /**
     * Filtruje strumień na podstawie predykatu
     */
    filter(predicate: (item: StreamDataItem) => boolean): StreamProcessor {
        const filteredProcessor = new StreamProcessor(this.config);
        
        filteredProcessor.setProcessFunction(async (item) => {
            return predicate(item) ? item : null;
        });
        
        // Przekieruj eventy
        this.on('data', (event) => {
            if (event.data && predicate(event.data)) {
                filteredProcessor.emit('data', event);
            }
        });
        
        return filteredProcessor;
    }

    /**
     * Mapuje elementy strumienia
     */
    map(mapper: (item: StreamDataItem) => StreamDataItem): StreamProcessor {
        const mappedProcessor = new StreamProcessor(this.config);
        
        mappedProcessor.setProcessFunction(async (item) => {
            return mapper(item);
        });
        
        // Przekieruj eventy
        this.on('data', (event) => {
            if (event.data) {
                const mapped = mapper(event.data);
                mappedProcessor.emit('data', { type: 'data', data: mapped });
            }
        });
        
        return mappedProcessor;
    }

    /**
     * Zwraca aktualne statystyki
     */
    getStats(): StreamStats {
        return { ...this.stats };
    }

    /**
     * Resetuje statystyki
     */
    resetStats(): void {
        this.stats = {
            itemsProcessed: 0,
            itemsPerSecond: 0,
            averageProcessingTime: 0,
            bufferUsage: this.buffer.length,
            memoryUsage: this.getMemoryUsage(),
            errorsCount: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };
        console.log(`📊 Statystyki zresetowane`);
    }

    /**
     * Zapisuje buffer do pliku
     */
    private async flushBuffer(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }

        const itemsToFlush = [...this.buffer];
        this.buffer = [];

        try {
            // Zapisz do pliku jeśli skonfigurowane
            if (this.config.persistToFile && this.outputFile) {
                for (const item of itemsToFlush) {
                    this.outputFile.write(JSON.stringify(item) + '\n');
                }
            }

            console.log(`💾 Flush: ${itemsToFlush.length} elementów`);
            this.emit('flush', { 
                type: 'flush', 
                data: { 
                    itemsCount: itemsToFlush.length,
                    sessionId: this.sessionId 
                }
            });

        } catch (error) {
            // Przywróć elementy do bufora w przypadku błędu
            this.buffer.unshift(...itemsToFlush);
            this.stats.errorsCount++;
            throw error;
        }
    }

    /**
     * Konfiguruje automatyczne flush
     */
    private setupAutoFlush(): void {
        this.flushTimer = setInterval(async () => {
            if (this.isRunning && this.buffer.length > 0) {
                try {
                    await this.flushBuffer();
                } catch (error) {
                    console.error(`❌ Błąd automatycznego flush:`, error);
                }
            }
        }, this.config.flushInterval);
    }

    /**
     * Aktualizuje statystyki
     */
    private updateStats(processingTime: number): void {
        this.stats.itemsProcessed++;
        this.stats.bufferUsage = this.buffer.length;
        this.stats.memoryUsage = this.getMemoryUsage();
        this.stats.lastUpdateTime = Date.now();
        
        // Aktualizuj średni czas przetwarzania
        const previousTotal = this.stats.averageProcessingTime * (this.stats.itemsProcessed - 1);
        this.stats.averageProcessingTime = (previousTotal + processingTime) / this.stats.itemsProcessed;
        
        // Aktualizuj items per second
        const elapsedSeconds = (Date.now() - this.stats.startTime) / 1000;
        this.stats.itemsPerSecond = this.stats.itemsProcessed / elapsedSeconds;
        
        // Emituj statystyki co 100 elementów
        if (this.stats.itemsProcessed % 100 === 0) {
            this.emit('stats', { type: 'stats', stats: this.stats });
        }
    }

    /**
     * Sprawdza użycie pamięci
     */
    private checkMemoryUsage(): void {
        const memoryUsageMB = this.getMemoryUsage();
        if (memoryUsageMB > this.config.maxMemoryUsage) {
            console.warn(`⚠️ Wysokie użycie pamięci: ${memoryUsageMB}MB (limit: ${this.config.maxMemoryUsage}MB)`);
            
            // Wymuś flush jeśli przekroczono limit
            this.flushBuffer().catch(error => {
                console.error(`❌ Błąd flush przy wysokim użyciu pamięci:`, error);
            });
        }
    }

    /**
     * Zwraca użycie pamięci w MB
     */
    private getMemoryUsage(): number {
        const used = process.memoryUsage();
        return Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    }

    /**
     * Czyści wszystkie zasoby
     */
    async cleanup(): Promise<void> {
        await this.stop();
        this.removeAllListeners();
        console.log(`🧹 Stream processor wyczyszczony`);
    }
}

/**
 * Zarządca wielu stream processorów
 */
export class StreamManager {
    private processors: Map<string, StreamProcessor> = new Map();
    private config: StreamProcessingConfig;

    constructor(config: Partial<StreamProcessingConfig> = {}) {
        this.config = {
            bufferSize: config.bufferSize || 1000,
            flushInterval: config.flushInterval || 5000,
            maxMemoryUsage: config.maxMemoryUsage || 100,
            compressionEnabled: config.compressionEnabled || false,
            persistToFile: config.persistToFile || true,
            outputDirectory: config.outputDirectory || path.join(process.cwd(), 'temp', 'streams')
        };
    }

    /**
     * Tworzy nowy stream processor
     */
    createStream(id: string, config?: Partial<StreamProcessingConfig>): StreamProcessor {
        if (this.processors.has(id)) {
            throw new Error(`Stream processor o ID '${id}' już istnieje`);
        }

        const streamConfig = { ...this.config, ...config };
        const processor = new StreamProcessor(streamConfig);
        this.processors.set(id, processor);
        
        console.log(`📊 Utworzono stream processor: ${id}`);
        return processor;
    }

    /**
     * Pobiera stream processor
     */
    getStream(id: string): StreamProcessor | undefined {
        return this.processors.get(id);
    }

    /**
     * Usuwa stream processor
     */
    async removeStream(id: string): Promise<boolean> {
        const processor = this.processors.get(id);
        if (!processor) {
            return false;
        }

        await processor.cleanup();
        this.processors.delete(id);
        console.log(`🗑️ Usunięto stream processor: ${id}`);
        return true;
    }

    /**
     * Zwraca wszystkie aktywne streamy
     */
    getAllStreams(): Record<string, StreamStats> {
        const result: Record<string, StreamStats> = {};
        for (const id of this.processors.keys()) {
            const processor = this.processors.get(id);
            if (processor) {
                result[id] = processor.getStats();
            }
        }
        return result;
    }

    /**
     * Zatrzymuje wszystkie streamy
     */
    async stopAll(): Promise<void> {
        console.log(`⏹️ Zatrzymywanie ${this.processors.size} stream processorów...`);
        
        const promises = Array.from(this.processors.values()).map(processor => 
            processor.cleanup()
        );
        
        await Promise.all(promises);
        this.processors.clear();
        console.log(`✅ Wszystkie stream processory zatrzymane`);
    }

    /**
     * Zwraca statystyki wszystkich streamów
     */
    getGlobalStats(): {
        totalProcessors: number;
        totalItemsProcessed: number;
        totalErrors: number;
        averageItemsPerSecond: number;
        totalMemoryUsage: number;
    } {
        const allStats = Object.values(this.getAllStreams());
        
        return {
            totalProcessors: allStats.length,
            totalItemsProcessed: allStats.reduce((sum, stats) => sum + stats.itemsProcessed, 0),
            totalErrors: allStats.reduce((sum, stats) => sum + stats.errorsCount, 0),
            averageItemsPerSecond: allStats.reduce((sum, stats) => sum + stats.itemsPerSecond, 0) / (allStats.length || 1),
            totalMemoryUsage: allStats.reduce((sum, stats) => sum + stats.memoryUsage, 0)
        };
    }
}

// Export dla łatwego użycia
export const streamManager = new StreamManager();

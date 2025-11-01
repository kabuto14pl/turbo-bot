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
exports.streamManager = exports.StreamManager = exports.StreamProcessor = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stream_1 = require("stream");
/**
 * Klasa do przetwarzania strumieni danych w czasie rzeczywistym
 */
class StreamProcessor extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.buffer = [];
        this.isRunning = false;
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
    start() {
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
    async stop() {
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
    setProcessFunction(fn) {
        this.processFunction = fn;
        console.log(`🔧 Funkcja przetwarzania ustawiona`);
    }
    /**
     * Dodaje element do strumienia
     */
    async addItem(data, metadata) {
        if (!this.isRunning) {
            throw new Error('Stream processor nie jest uruchomiony');
        }
        const item = {
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
        }
        catch (error) {
            this.stats.errorsCount++;
            this.emit('error', { type: 'error', error: error });
            console.error(`❌ Błąd przetwarzania elementu:`, error);
        }
    }
    /**
     * Dodaje wiele elementów naraz
     */
    async addBatch(items, metadata) {
        console.log(`📦 Dodawanie batch ${items.length} elementów...`);
        for (const data of items) {
            await this.addItem(data, metadata);
        }
        console.log(`✅ Batch zakończony`);
    }
    /**
     * Tworzy stream transform
     */
    createTransformStream() {
        return new stream_1.Transform({
            objectMode: true,
            transform: async (chunk, encoding, callback) => {
                try {
                    await this.addItem(chunk);
                    callback();
                }
                catch (error) {
                    callback(error instanceof Error ? error : new Error(String(error)));
                }
            }
        });
    }
    /**
     * Tworzy readable stream z bufora
     */
    createReadableStream() {
        let index = 0;
        const buffer = [...this.buffer];
        return new stream_1.Readable({
            objectMode: true,
            read() {
                if (index < buffer.length) {
                    this.push(buffer[index++]);
                }
                else {
                    this.push(null); // End of stream
                }
            }
        });
    }
    /**
     * Filtruje strumień na podstawie predykatu
     */
    filter(predicate) {
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
    map(mapper) {
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
    getStats() {
        return { ...this.stats };
    }
    /**
     * Resetuje statystyki
     */
    resetStats() {
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
    async flushBuffer() {
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
        }
        catch (error) {
            // Przywróć elementy do bufora w przypadku błędu
            this.buffer.unshift(...itemsToFlush);
            this.stats.errorsCount++;
            throw error;
        }
    }
    /**
     * Konfiguruje automatyczne flush
     */
    setupAutoFlush() {
        this.flushTimer = setInterval(async () => {
            if (this.isRunning && this.buffer.length > 0) {
                try {
                    await this.flushBuffer();
                }
                catch (error) {
                    console.error(`❌ Błąd automatycznego flush:`, error);
                }
            }
        }, this.config.flushInterval);
    }
    /**
     * Aktualizuje statystyki
     */
    updateStats(processingTime) {
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
    checkMemoryUsage() {
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
    getMemoryUsage() {
        const used = process.memoryUsage();
        return Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    }
    /**
     * Czyści wszystkie zasoby
     */
    async cleanup() {
        await this.stop();
        this.removeAllListeners();
        console.log(`🧹 Stream processor wyczyszczony`);
    }
}
exports.StreamProcessor = StreamProcessor;
/**
 * Zarządca wielu stream processorów
 */
class StreamManager {
    constructor(config = {}) {
        this.processors = new Map();
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
    createStream(id, config) {
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
    getStream(id) {
        return this.processors.get(id);
    }
    /**
     * Usuwa stream processor
     */
    async removeStream(id) {
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
    getAllStreams() {
        const result = {};
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
    async stopAll() {
        console.log(`⏹️ Zatrzymywanie ${this.processors.size} stream processorów...`);
        const promises = Array.from(this.processors.values()).map(processor => processor.cleanup());
        await Promise.all(promises);
        this.processors.clear();
        console.log(`✅ Wszystkie stream processory zatrzymane`);
    }
    /**
     * Zwraca statystyki wszystkich streamów
     */
    getGlobalStats() {
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
exports.StreamManager = StreamManager;
// Export dla łatwego użycia
exports.streamManager = new StreamManager();

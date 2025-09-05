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
exports.dataChunker = exports.DataChunker = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
/**
 * Klasa do zarządzania chunking dużych zbiorów danych
 */
class DataChunker {
    constructor(config = {}) {
        this.activeStreams = new Set();
        this.config = {
            chunkSize: config.chunkSize || 1024 * 1024, // 1MB domyślnie
            maxMemoryUsage: config.maxMemoryUsage || 100, // 100MB domyślnie
            compressionEnabled: config.compressionEnabled || false,
            tempDirectory: config.tempDirectory || path.join(process.cwd(), 'temp', 'chunks')
        };
        // Utwórz katalog tymczasowy jeśli nie istnieje
        if (!fs.existsSync(this.config.tempDirectory)) {
            fs.mkdirSync(this.config.tempDirectory, { recursive: true });
        }
    }
    /**
     * Dzieli plik na chunki
     */
    async chunkFile(filePath, outputPrefix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Plik nie istnieje: ${filePath}`);
        }
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        const totalChunks = Math.ceil(fileSize / this.config.chunkSize);
        const chunks = [];
        const basePrefix = outputPrefix || path.basename(filePath, path.extname(filePath));
        const sessionId = Date.now().toString();
        console.log(`📁 Dzielenie pliku ${filePath} (${this.formatBytes(fileSize)}) na ${totalChunks} chunków...`);
        for (let i = 0; i < totalChunks; i++) {
            const chunkId = `${basePrefix}_${sessionId}_chunk_${i.toString().padStart(4, '0')}`;
            const chunkPath = path.join(this.config.tempDirectory, `${chunkId}.chunk`);
            const start = i * this.config.chunkSize;
            const end = Math.min(start + this.config.chunkSize, fileSize);
            const chunkSize = end - start;
            // Stwórz stream do odczytu fragmentu pliku
            const readStream = (0, fs_1.createReadStream)(filePath, { start, end: end - 1 });
            const writeStream = (0, fs_1.createWriteStream)(chunkPath);
            // Oblicz checksum podczas kopiowania
            let checksum = '';
            await new Promise((resolve, reject) => {
                const crypto = require('crypto');
                const hash = crypto.createHash('md5');
                readStream.on('data', (chunk) => {
                    hash.update(chunk);
                });
                readStream.on('end', () => {
                    checksum = hash.digest('hex');
                });
                readStream.pipe(writeStream);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                readStream.on('error', reject);
            });
            const metadata = {
                id: chunkId,
                index: i,
                totalChunks,
                size: chunkSize,
                checksum,
                filePath: chunkPath,
                createdAt: Date.now()
            };
            chunks.push(metadata);
            console.log(`✅ Chunk ${i + 1}/${totalChunks}: ${this.formatBytes(chunkSize)} (${checksum})`);
        }
        // Zapisz manifest
        const manifestPath = path.join(this.config.tempDirectory, `${basePrefix}_${sessionId}_manifest.json`);
        const result = {
            totalChunks,
            totalSize: fileSize,
            chunks,
            manifestPath
        };
        fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2));
        console.log(`📋 Manifest zapisany: ${manifestPath}`);
        return result;
    }
    /**
     * Dzieli dane JSON na chunki
     */
    async chunkJsonData(data, outputPrefix) {
        const serializedData = JSON.stringify(data);
        const dataSize = Buffer.byteLength(serializedData, 'utf8');
        const itemsPerChunk = Math.floor(this.config.chunkSize / (dataSize / data.length));
        const totalChunks = Math.ceil(data.length / itemsPerChunk);
        const chunks = [];
        const sessionId = Date.now().toString();
        console.log(`📊 Dzielenie ${data.length} elementów JSON (${this.formatBytes(dataSize)}) na ${totalChunks} chunków...`);
        for (let i = 0; i < totalChunks; i++) {
            const start = i * itemsPerChunk;
            const end = Math.min(start + itemsPerChunk, data.length);
            const chunkData = data.slice(start, end);
            const chunkId = `${outputPrefix}_${sessionId}_json_chunk_${i.toString().padStart(4, '0')}`;
            const chunkPath = path.join(this.config.tempDirectory, `${chunkId}.json`);
            const chunkJson = JSON.stringify(chunkData, null, 2);
            const chunkSize = Buffer.byteLength(chunkJson, 'utf8');
            // Zapisz chunk
            fs.writeFileSync(chunkPath, chunkJson);
            // Oblicz checksum
            const crypto = require('crypto');
            const checksum = crypto.createHash('md5').update(chunkJson).digest('hex');
            const metadata = {
                id: chunkId,
                index: i,
                totalChunks,
                size: chunkSize,
                checksum,
                filePath: chunkPath,
                createdAt: Date.now()
            };
            chunks.push(metadata);
            console.log(`✅ JSON Chunk ${i + 1}/${totalChunks}: ${end - start} elementów, ${this.formatBytes(chunkSize)}`);
        }
        // Zapisz manifest
        const manifestPath = path.join(this.config.tempDirectory, `${outputPrefix}_${sessionId}_json_manifest.json`);
        const result = {
            totalChunks,
            totalSize: dataSize,
            chunks,
            manifestPath
        };
        fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2));
        console.log(`📋 JSON Manifest zapisany: ${manifestPath}`);
        return result;
    }
    /**
     * Składa chunki z powrotem w całość
     */
    async assembleChunks(manifestPath, outputPath) {
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest nie istnieje: ${manifestPath}`);
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(`🔧 Składanie ${manifest.totalChunks} chunków z ${manifestPath}...`);
        const writeStream = (0, fs_1.createWriteStream)(outputPath);
        let processedSize = 0;
        for (const chunk of manifest.chunks) {
            if (!fs.existsSync(chunk.filePath)) {
                throw new Error(`Chunk nie istnieje: ${chunk.filePath}`);
            }
            // Weryfikuj checksum
            const chunkData = fs.readFileSync(chunk.filePath);
            const crypto = require('crypto');
            const actualChecksum = crypto.createHash('md5').update(chunkData).digest('hex');
            if (actualChecksum !== chunk.checksum) {
                throw new Error(`Checksum się nie zgadza dla chunk ${chunk.id}: oczekiwano ${chunk.checksum}, otrzymano ${actualChecksum}`);
            }
            // Dopisz chunk do pliku wyjściowego
            await new Promise((resolve, reject) => {
                const readStream = (0, fs_1.createReadStream)(chunk.filePath);
                readStream.pipe(writeStream, { end: false });
                readStream.on('end', resolve);
                readStream.on('error', reject);
            });
            processedSize += chunk.size;
            const progress = ((processedSize / manifest.totalSize) * 100).toFixed(1);
            console.log(`✅ Chunk ${chunk.index + 1}/${manifest.totalChunks} dodany (${progress}%)`);
        }
        writeStream.end();
        console.log(`🎉 Plik składany pomyślnie: ${outputPath} (${this.formatBytes(manifest.totalSize)})`);
    }
    /**
     * Składa chunki JSON z powrotem w tablicę
     */
    async assembleJsonChunks(manifestPath) {
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`JSON Manifest nie istnieje: ${manifestPath}`);
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(`🔧 Składanie ${manifest.totalChunks} JSON chunków z ${manifestPath}...`);
        let result = [];
        for (const chunk of manifest.chunks) {
            if (!fs.existsSync(chunk.filePath)) {
                throw new Error(`JSON Chunk nie istnieje: ${chunk.filePath}`);
            }
            const chunkData = JSON.parse(fs.readFileSync(chunk.filePath, 'utf8'));
            result = result.concat(chunkData);
            console.log(`✅ JSON Chunk ${chunk.index + 1}/${manifest.totalChunks} dodany (${chunkData.length} elementów)`);
        }
        console.log(`🎉 JSON składany pomyślnie: ${result.length} elementów`);
        return result;
    }
    /**
     * Czyści pliki chunków na podstawie manifestu
     */
    async cleanupChunks(manifestPath) {
        if (!fs.existsSync(manifestPath)) {
            console.warn(`Manifest nie istnieje: ${manifestPath}`);
            return;
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(`🧹 Sprzątanie ${manifest.totalChunks} chunków...`);
        for (const chunk of manifest.chunks) {
            if (fs.existsSync(chunk.filePath)) {
                fs.unlinkSync(chunk.filePath);
                console.log(`🗑️ Usunięto chunk: ${chunk.filePath}`);
            }
        }
        // Usuń manifest
        fs.unlinkSync(manifestPath);
        console.log(`🗑️ Usunięto manifest: ${manifestPath}`);
        console.log(`✅ Sprzątanie zakończone`);
    }
    /**
     * Formatuje rozmiar w bajtach na czytelny format
     */
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    /**
     * Zwraca informacje o konfiguracji
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Czyści wszystkie pliki tymczasowe w katalogu chunków
     */
    async cleanupAll() {
        if (!fs.existsSync(this.config.tempDirectory)) {
            return;
        }
        const files = fs.readdirSync(this.config.tempDirectory);
        let deletedCount = 0;
        for (const file of files) {
            const filePath = path.join(this.config.tempDirectory, file);
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        }
        console.log(`🧹 Usunięto ${deletedCount} plików tymczasowych z ${this.config.tempDirectory}`);
    }
}
exports.DataChunker = DataChunker;
// Export dla łatwego użycia
exports.dataChunker = new DataChunker();

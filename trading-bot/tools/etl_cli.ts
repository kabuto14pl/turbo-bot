/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import { ETLProcessor } from '../infrastructure/data/etl/etl_processor';
import { ETLConfig } from '../infrastructure/data/etl/types';
import * as path from 'path';

interface CLIOptions {
    input: string;
    output?: string;
    verbose?: boolean;
    validateTimestamps?: boolean;
    validatePrices?: boolean;
    validateVolume?: boolean;
    allowNegativePrices?: boolean;
    allowZeroVolume?: boolean;
    maxFillableGaps?: number;
    maxCriticalGap?: number;
    outputFormat?: 'csv' | 'json';
    help?: boolean;
}

function printHelp(): void {
    console.log(`
=== ETL CLI - Narzędzie do czyszczenia i walidacji danych ===

Użycie:
  npm run etl <opcje>

Opcje:
  --input <ścieżka>           Ścieżka do pliku wejściowego (wymagane)
  --output <ścieżka>          Ścieżka do pliku wyjściowego (opcjonalne)
  --verbose                   Szczegółowe logowanie
  --validateTimestamps        Waliduj timestamps (domyślnie: true)
  --validatePrices           Waliduj ceny (domyślnie: true)
  --validateVolume           Waliduj volume (domyślnie: true)
  --allowNegativePrices      Pozwól na ujemne ceny (domyślnie: false)
  --allowZeroVolume          Pozwól na zero volume (domyślnie: true)
  --maxFillableGaps <liczba>  Maksymalna liczba luk do wypełnienia (domyślnie: 10)
  --maxCriticalGap <ms>      Maksymalna luka w ms (domyślnie: 43200000 = 12h)
  --outputFormat <format>    Format wyjściowy: csv lub json (domyślnie: csv)
  --help                     Pokaż tę pomoc

Przykłady:
  npm run etl --input data/BTCUSDT/15m.csv --output data/clean/BTCUSDT_15m.csv
  npm run etl --input data/BTCUSDT/15m.csv --verbose --maxFillableGaps 5
  npm run etl --input data/BTCUSDT/15m.csv --output data/clean/BTCUSDT_15m.json --outputFormat json
`);
}

function parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
        input: ''
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--input':
                options.input = args[++i];
                break;
            case '--output':
                options.output = args[++i];
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--validateTimestamps':
                options.validateTimestamps = true;
                break;
            case '--validatePrices':
                options.validatePrices = true;
                break;
            case '--validateVolume':
                options.validateVolume = true;
                break;
            case '--allowNegativePrices':
                options.allowNegativePrices = true;
                break;
            case '--allowZeroVolume':
                options.allowZeroVolume = true;
                break;
            case '--maxFillableGaps':
                options.maxFillableGaps = parseInt(args[++i]);
                break;
            case '--maxCriticalGap':
                options.maxCriticalGap = parseInt(args[++i]);
                break;
            case '--outputFormat':
                options.outputFormat = args[++i] as 'csv' | 'json';
                break;
            case '--help':
                options.help = true;
                break;
        }
    }
    
    return options;
}

function printResult(result: any): void {
    console.log('\n=== WYNIK PRZETWARZANIA ETL ===');
    console.log(`Status: ${result.success ? '✅ SUKCES' : '❌ BŁĘDY'}`);
    console.log(`Plik wejściowy: ${result.inputPath}`);
    if (result.outputPath) {
        console.log(`Plik wyjściowy: ${result.outputPath}`);
    }
    console.log(`Czas przetwarzania: ${result.processingTime}ms`);
    console.log(`Wiersze oryginalne: ${result.originalRowCount}`);
    console.log(`Wiersze końcowe: ${result.finalRowCount}`);
    
    if (result.validation) {
        console.log('\n📊 STATYSTYKI WALIDACJI:');
        const stats = result.validation.stats;
        console.log(`  • Wiersze: ${stats.totalRows} (${stats.validRows} poprawne, ${stats.invalidRows} błędne)`);
        console.log(`  • Luki: ${stats.gaps} (${stats.filledGaps} wypełnione, ${stats.criticalGaps} krytyczne)`);
        console.log(`  • Zakres czasowy: ${new Date(stats.timeRange.start).toISOString()} - ${new Date(stats.timeRange.end).toISOString()}`);
        console.log(`  • Czas trwania: ${Math.round(stats.timeRange.duration / (1000 * 60 * 60 * 24))} dni`);
        
        console.log(`  • Volume: średnia ${stats.volumeStats.average.toFixed(2)}, min ${stats.volumeStats.min}, max ${stats.volumeStats.max}`);
        console.log(`  • Ceny: średnia ${stats.priceStats.averagePrice.toFixed(2)}, min ${stats.priceStats.minPrice}, max ${stats.priceStats.maxPrice}`);
        
        if (result.validation.errors.length > 0) {
            console.log(`\n❌ BŁĘDY (${result.validation.errors.length}):`);
            result.validation.errors.slice(0, 5).forEach((error: any, index: number) => {
                console.log(`  ${index + 1}. ${error.message}`);
            });
            if (result.validation.errors.length > 5) {
                console.log(`  ... i ${result.validation.errors.length - 5} więcej`);
            }
        }
        
        if (result.validation.warnings.length > 0) {
            console.log(`\n⚠️  OSTRZEŻENIA (${result.validation.warnings.length}):`);
            result.validation.warnings.slice(0, 5).forEach((warning: any, index: number) => {
                console.log(`  ${index + 1}. ${warning.message}`);
            });
            if (result.validation.warnings.length > 5) {
                console.log(`  ... i ${result.validation.warnings.length - 5} więcej`);
            }
        }
    }
    
    console.log('\n=== KONIEC ===\n');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    
    if (options.help || !options.input) {
        printHelp();
        return;
    }
    
    try {
        console.log('🔧 ETL CLI - Rozpoczynam przetwarzanie...\n');
        
        // Konfiguracja ETL
        const config: Partial<ETLConfig> = {
            validateTimestamps: options.validateTimestamps ?? true,
            validatePrices: options.validatePrices ?? true,
            validateVolume: options.validateVolume ?? true,
            allowNegativePrices: options.allowNegativePrices ?? false,
            allowZeroVolume: options.allowZeroVolume ?? true,
            maxFillableGaps: options.maxFillableGaps ?? 10,
            maxCriticalGap: options.maxCriticalGap ?? 12 * 60 * 60 * 1000,
            outputFormat: options.outputFormat ?? 'csv',
            verbose: options.verbose ?? false,
            logValidationErrors: true
        };
        
        // Utwórz procesor ETL
        const processor = new ETLProcessor(config);
        
        // Przetwórz plik
        const result = await processor.processFile(options.input, options.output);
        
        // Wyświetl wyniki
        printResult(result);
        
        // Kod wyjścia
        process.exit(result.success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Błąd podczas przetwarzania:', error);
        process.exit(1);
    }
}

// Uruchom jeśli to główny moduł
if (require.main === module) {
    main().catch(console.error);
} 
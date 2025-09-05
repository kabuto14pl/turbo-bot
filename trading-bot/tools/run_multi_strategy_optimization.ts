// ============================================================================
//  run_multi_strategy_optimization.ts - Uruchomienie pełnej optymalizacji strategii
//  Ten plik uruchamia skrypt simple_multi_strategy_optimization.ts, który wykonuje
//  optymalizację wszystkich strategii handlowych.
// ============================================================================

import { spawn } from 'child_process';
import * as path from 'path';

function runOptimization() {
    console.log('\n=== URUCHAMIAM PEŁNĄ OPTYMALIZACJĘ WSZYSTKICH STRATEGII ===\n');
    
    const scriptPath = path.join(__dirname, 'simple_multi_strategy_optimization.ts');
    
    // Uruchom skrypt przy użyciu ts-node
    const process = spawn('ts-node', [scriptPath], {
        stdio: 'inherit',
        shell: true
    });
    
    process.on('close', (code) => {
        if (code === 0) {
            console.log('\n=== OPTYMALIZACJA ZAKOŃCZONA POMYŚLNIE ===');
        } else {
            console.error(`\n=== BŁĄD PODCZAS OPTYMALIZACJI (kod: ${code}) ===`);
        }
    });
}

// Uruchom optymalizację
runOptimization();

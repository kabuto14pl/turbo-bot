"use strict";
// ============================================================================
//  run_multi_strategy_optimization.ts - Uruchomienie pełnej optymalizacji strategii
//  Ten plik uruchamia skrypt simple_multi_strategy_optimization.ts, który wykonuje
//  optymalizację wszystkich strategii handlowych.
// ============================================================================
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
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
function runOptimization() {
    console.log('\n=== URUCHAMIAM PEŁNĄ OPTYMALIZACJĘ WSZYSTKICH STRATEGII ===\n');
    const scriptPath = path.join(__dirname, 'simple_multi_strategy_optimization.ts');
    // Uruchom skrypt przy użyciu ts-node
    const process = (0, child_process_1.spawn)('ts-node', [scriptPath], {
        stdio: 'inherit',
        shell: true
    });
    process.on('close', (code) => {
        if (code === 0) {
            console.log('\n=== OPTYMALIZACJA ZAKOŃCZONA POMYŚLNIE ===');
        }
        else {
            console.error(`\n=== BŁĄD PODCZAS OPTYMALIZACJI (kod: ${code}) ===`);
        }
    });
}
// Uruchom optymalizację
runOptimization();

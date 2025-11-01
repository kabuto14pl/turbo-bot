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
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
/**
 * 🧪 [TESTING-FRAMEWORK]
 **
 * 🧪 [TESTING-FRAMEWORK]
 * Prosty test Ray Tune z bardzo prostą funkcją celu
 */
function logWithTime(message) {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[${timestamp}] ${message}`);
}
async function testSimpleRayTune() {
    logWithTime("🚀 Rozpoczynam prosty test Ray Tune...");
    // Tworzymy bardzo prosty skrypt Python
    const pythonScript = `
import ray
from ray import tune
import time
import json
import sys

def simple_objective(config):
    """Bardzo prosta funkcja - zwraca wynik natychmiast"""
    x = config["x"]
    y = config["y"]
    
    # Prosta funkcja kwadratowa - minimum w (0, 0)
    result = x**2 + y**2
    
    # Krótka symulacja obliczeń
    time.sleep(0.1)  # Tylko 100ms
    
    # Zwracamy wynik w nowej składni Ray Tune 2.x
    return {"score": result}

# Konfiguracja Ray Tune - bardzo prosta
config = {
    "x": tune.uniform(-2, 2),
    "y": tune.uniform(-2, 2)
}

if __name__ == "__main__":
    # Inicjalizacja Ray z timeout
    ray.init(ignore_reinit_error=True)
    
    try:
        # Uruchomienie optymalizacji z KRÓTKIM czasem
        tuner = tune.Tuner(
            simple_objective,
            param_space=config,
            tune_config=tune.TuneConfig(
                metric="score",
                mode="min",
                num_samples=3,  # Tylko 3 próby
                max_concurrent_trials=1  # Po kolei
            ),
            run_config=tune.RunConfig(
                stop={"training_iteration": 1},  # Tylko 1 iteracja
                failure_config=tune.FailureConfig(max_failures=1)
            )
        )
        
        results = tuner.fit()
        best_result = results.get_best_result()
        
        # Zwróć wynik
        result = {
            "best_config": best_result.config,
            "best_score": best_result.metrics["score"],
            "status": "success"
        }
        
        print(json.dumps(result))
        
    finally:
        ray.shutdown()
`;
    // Zapisz skrypt do pliku tymczasowego
    const fs = require('fs');
    const tempScriptPath = path.join(__dirname, 'python', 'simple_ray_test.py');
    // Utwórz katalog jeśli nie istnieje
    const dir = path.dirname(tempScriptPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tempScriptPath, pythonScript);
    logWithTime(`📝 Zapisano skrypt Python: ${tempScriptPath}`);
    // Konwersja ścieżki dla WSL
    let wslScriptPath = tempScriptPath;
    if (/^[A-Za-z]:\\/.test(tempScriptPath)) {
        wslScriptPath = '/mnt/' + tempScriptPath[0].toLowerCase() + tempScriptPath.slice(2).replace(/\\/g, '/');
    }
    logWithTime(`🐍 Uruchamianie Python skryptu: ${wslScriptPath}`);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pythonProcess.kill();
            reject(new Error('Ray Tune test przekroczył limit czasu (60s)'));
        }, 60000); // 60 sekund timeout
        const pythonProcess = (0, child_process_1.spawn)('python3.10', [wslScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });
        let output = '';
        let errorOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            logWithTime(`📤 Python: ${text.trim()}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            logWithTime(`❌ Python Error: ${text.trim()}`);
        });
        pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                try {
                    // Szukaj JSON w output
                    const lines = output.split('\n');
                    let result = null;
                    for (const line of lines) {
                        if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                            result = JSON.parse(line.trim());
                            break;
                        }
                    }
                    if (result) {
                        logWithTime(`✅ Ray Tune zakończone pomyślnie!`);
                        logWithTime(`📊 Najlepszy wynik: x=${result.best_config.x.toFixed(3)}, y=${result.best_config.y.toFixed(3)}, score=${result.best_score.toFixed(4)}`);
                        resolve();
                    }
                    else {
                        logWithTime(`⚠️ Nie znaleziono wyniku JSON w output`);
                        reject(new Error('Brak wyniku JSON'));
                    }
                }
                catch (error) {
                    logWithTime(`❌ Błąd parsowania wyniku: ${error}`);
                    reject(error);
                }
            }
            else {
                logWithTime(`❌ Python zakończył się z kodem: ${code}`);
                logWithTime(`❌ Błędy: ${errorOutput}`);
                reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
            }
        });
        pythonProcess.on('error', (error) => {
            clearTimeout(timeout);
            logWithTime(`❌ Błąd uruchamiania Python: ${error.message}`);
            reject(error);
        });
    });
}
// Test
async function main() {
    try {
        await testSimpleRayTune();
        logWithTime("🎉 Test zakończony pomyślnie!");
    }
    catch (error) {
        logWithTime(`💥 Test nieudany: ${error}`);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}

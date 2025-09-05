import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Bardzo prosty test Ray Tune z agresywnym timeout
 */

function logWithTime(message: string) {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[${timestamp}] ${message}`);
}

async function testSimpleRayTuneWithKill(): Promise<void> {
    logWithTime("🚀 Rozpoczynam prosty test Ray Tune z agresywnym timeout...");
    
    const pythonScript = `
import ray
from ray import tune
import time
import json
import sys
import signal
import os

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

def signal_handler(signum, frame):
    print("Otrzymano sygnał przerwania - zamykanie Ray...")
    ray.shutdown()
    sys.exit(0)

# Rejestracja handlera sygnału
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

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
                num_samples=20,  # Więcej próby
                max_concurrent_trials=2  # Po 2 równolegle
            ),
            run_config=tune.RunConfig(
                stop={"training_iteration": 1},  # Tylko 1 iteracja
                failure_config=tune.FailureConfig(max_failures=3)
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
        
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
    finally:
        ray.shutdown()
`;

    const fs = require('fs');
    const tempScriptPath = path.join(__dirname, 'python', 'simple_ray_test_kill.py');
    
    const dir = path.dirname(tempScriptPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(tempScriptPath, pythonScript);
    logWithTime(`📝 Zapisano skrypt Python: ${tempScriptPath}`);

    let wslScriptPath = tempScriptPath;
    if (/^[A-Za-z]:\\/.test(tempScriptPath)) {
        wslScriptPath = '/mnt/' + tempScriptPath[0].toLowerCase() + tempScriptPath.slice(2).replace(/\\/g, '/');
    }

    logWithTime(`🐍 Uruchamianie Python skryptu: ${wslScriptPath}`);
    
    return new Promise((resolve, reject) => {
        const TIMEOUT_MS = 120000; // 2 minuty zamiast 10
        let isCompleted = false;
        
        const pythonProcess = spawn('python3.10', [wslScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        // AGRESYWNY TIMEOUT - zabije proces po 2 minutach
        const timeoutHandle = setTimeout(() => {
            if (!isCompleted) {
                logWithTime(`💀 AGRESYWNY TIMEOUT - zabijam proces Python po 2 minutach`);
                
                // Próbuj graceful shutdown
                pythonProcess.kill('SIGTERM');
                
                // Po 5 sekundach force kill
                setTimeout(() => {
                    if (!isCompleted) {
                        logWithTime(`💀 FORCE KILL procesu Python`);
                        pythonProcess.kill('SIGKILL');
                        
                        // Zabij wszystkie procesy Ray
                        spawn('pkill', ['-f', 'ray'], { stdio: 'ignore' });
                        spawn('pkill', ['-f', 'python.*tune'], { stdio: 'ignore' });
                        
                        reject(new Error('AGRESYWNY TIMEOUT - proces zabity po 2 minutach'));
                    }
                }, 5000);
            }
        }, TIMEOUT_MS);

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
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timeoutHandle);
                
                if (code === 0) {
                    try {
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
                            const resultObj = result as any;
                            if (resultObj.best_config && resultObj.best_score !== undefined) {
                                logWithTime(`📊 Najlepszy wynik: x=${resultObj.best_config.x.toFixed(3)}, y=${resultObj.best_config.y.toFixed(3)}, score=${resultObj.best_score.toFixed(4)}`);
                            }
                            resolve();
                        } else {
                            logWithTime(`⚠️ Nie znaleziono wyniku JSON w output`);
                            reject(new Error('Brak wyniku JSON'));
                        }
                    } catch (error) {
                        logWithTime(`❌ Błąd parsowania wyniku: ${error}`);
                        reject(error);
                    }
                } else {
                    logWithTime(`❌ Python zakończył się z kodem: ${code}`);
                    reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
                }
            }
        });

        pythonProcess.on('error', (error) => {
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timeoutHandle);
                logWithTime(`❌ Błąd uruchamiania Python: ${error.message}`);
                reject(error);
            }
        });
    });
}

// Test
async function main() {
    try {
        await testSimpleRayTuneWithKill();
        logWithTime("🎉 Test zakończony pomyślnie!");
    } catch (error) {
        logWithTime(`💥 Test nieudany: ${error}`);
        
        // Cleanup - zabij wszystkie procesy Ray
        logWithTime("🧹 Sprzątanie procesów Ray...");
        spawn('pkill', ['-f', 'ray'], { stdio: 'ignore' });
        spawn('pkill', ['-f', 'python.*tune'], { stdio: 'ignore' });
        
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

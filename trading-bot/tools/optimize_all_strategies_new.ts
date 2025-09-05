// ============================================================================
//  optimize_all_strategies_new.ts - SKRYPT WYKONAWCZY OPTYMALIZACJI
//  Skrypt uruchamia optymalizację wszystkich strategii handlowych
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import * as os from 'os';
import { RayTuneOptimizer, ParameterSpace } from './ray_tune_optimizer';

// Funkcja do logowania z czasem
function logWithTime(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Konfiguracja ścieżek i środowiska
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Używamy systemowego Python 3.10.18 w WSL/Linux
const PYTHON_VENV_PATH = '/usr/bin/python3.10';
const REQUIREMENTS_PATH = path.join(PROJECT_ROOT, 'tools/python_archive/requirements.txt');

// Sprawdź czy środowisko Python jest odpowiednio skonfigurowane
async function checkPythonEnvironment() {
    try {
        // Sprawdź czy Python istnieje
        if (!fs.existsSync(PYTHON_VENV_PATH)) {
            logWithTime(`❌ Nie znaleziono interpretera Python: ${PYTHON_VENV_PATH}`);
            throw new Error(`Nie znaleziono interpretera Python: ${PYTHON_VENV_PATH}`);
        }
        
        logWithTime('✅ Interpreter Python znaleziony.');
        
        // Sprawdź wersję Pythona
        const versionProcess = spawn(PYTHON_VENV_PATH, ['--version']);
        let versionOutput = '';
        
        versionProcess.stdout.on('data', (data) => {
            versionOutput += data.toString();
        });
        
        versionProcess.stderr.on('data', (data) => {
            versionOutput += data.toString();
        });
        
        await new Promise<void>((resolve) => {
            versionProcess.on('close', () => resolve());
        });
        
        logWithTime(`� Wersja Pythona: ${versionOutput.trim()}`);
        
        // Sprawdź czy Ray jest zainstalowany
        const checkRayProcess = spawn(PYTHON_VENV_PATH, ['-c', 'import ray; print(f"Ray version: {ray.__version__}")']);
        let rayOutput = '';
        
        checkRayProcess.stdout.on('data', (data) => {
            rayOutput += data.toString();
            process.stdout.write(data.toString());
        });
        
        checkRayProcess.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
        
        const rayExitCode = await new Promise<number>((resolve) => {
            checkRayProcess.on('close', (code) => resolve(code || 0));
        });
        
        if (rayExitCode === 0) {
            logWithTime('✅ Ray jest zainstalowany.');
        } else {
            logWithTime('⚠️ Ray nie jest zainstalowany. Instaluję...');
            
            // Instaluj Ray
            const installRayProcess = spawn(PYTHON_VENV_PATH, ['-m', 'pip', 'install', '--user', '-r', REQUIREMENTS_PATH]);
            
            installRayProcess.stdout.on('data', (data) => {
                process.stdout.write(data.toString());
            });
            
            installRayProcess.stderr.on('data', (data) => {
                process.stderr.write(data.toString());
            });
            
            await new Promise<void>((resolve, reject) => {
                installRayProcess.on('close', (code) => {
                    if (code === 0) {
                        logWithTime('✅ Pakiety zainstalowane pomyślnie!');
                        resolve();
                    } else {
                        reject(new Error(`Błąd podczas instalacji pakietów (kod: ${code})`));
                    }
                });
            });
        }
    } catch (error: any) {
        logWithTime(`❌ Błąd podczas konfiguracji środowiska Python: ${error.message}`);
        throw error;
    }
}

// Testuj instalację Ray
async function testRayInstallation() {
    logWithTime('🧪 Testowanie instalacji Ray Tune...');
    
    const testScriptPath = path.resolve(__dirname, './python/test_ray_installation.py');
    const resultPath = path.resolve(__dirname, './python/ray_test_results.json');
    
    // Usuń ewentualny plik wynikowy z poprzedniego uruchomienia
    if (fs.existsSync(resultPath)) {
        fs.unlinkSync(resultPath);
    }
    
    // Uruchom test
    const testProcess = spawn(PYTHON_VENV_PATH, [testScriptPath, '--json', resultPath]);
    
    let stdoutData = '';
    let stderrData = '';
    
    testProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;
        process.stdout.write(output);
    });
    
    testProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderrData += output;
        process.stderr.write(output);
    });
    
    const exitCode = await new Promise<number>((resolve) => {
        testProcess.on('close', (code) => resolve(code || 0));
    });
    
    // Sprawdź wyniki testu
    if (exitCode === 0 && fs.existsSync(resultPath)) {
        try {
            const testResults = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
            
            if (testResults.ray_available && testResults.tune_available) {
                logWithTime('✅ Ray Tune działa poprawnie!');
                logWithTime(`📊 Ray wersja: ${testResults.ray_version}`);
                logWithTime(`🔧 Dostępne procesory: ${testResults.cpu_count}`);
                logWithTime(`💾 Dostępna pamięć: ${(testResults.memory_gb).toFixed(1)} GB`);
                return;
            } else if (testResults.ray_available) {
                logWithTime('⚠️ Ray działa, ale Ray Tune nie jest dostępny!');
                throw new Error('Ray Tune nie jest dostępny');
            } else {
                logWithTime('❌ Ray nie jest dostępny!');
                throw new Error('Ray nie jest dostępny');
            }
        } catch (error) {
            logWithTime(`❌ Błąd podczas analizy wyników testu: ${error}`);
            throw error;
        }
    } else {
        logWithTime(`❌ Test Ray Tune zakończył się niepowodzeniem (kod: ${exitCode})`);
        if (stderrData) {
            logWithTime(`❌ Błędy: ${stderrData}`);
        }
        throw new Error(`Test Ray Tune zakończył się niepowodzeniem (kod: ${exitCode})`);
    }
}

// Testuj demo Ray Tune
async function testRayTuneDemo() {
    logWithTime('🧪 Testowanie integracji Ray Tune z demo...');
    
    const demoProcess = spawn('npx', ['ts-node', path.resolve(__dirname, './ray_tune_demo.ts')]);
    
    demoProcess.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });
    
    demoProcess.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });
    
    return new Promise<void>((resolve, reject) => {
        demoProcess.on('close', (code) => {
            if (code === 0) {
                logWithTime('✅ Demo Ray Tune zakończone pomyślnie!');
                resolve();
            } else {
                logWithTime(`❌ Demo Ray Tune nie powiodło się (kod: ${code})`);
                reject(new Error(`Demo Ray Tune nie powiodło się (kod: ${code})`));
            }
        });
    });
}

// Uruchom optymalizację strategii
async function runOptimization() {
    logWithTime('🚀 Rozpoczynam optymalizację wszystkich strategii handlowych...');
    
    // Sprawdź, który plik optymalizacji istnieje i ma zawartość
    let optimizationFile = '';
    
    const potentialFiles = [
        path.resolve(__dirname, 'optimize_all_strategies_full.ts'),
        path.resolve(__dirname, 'ultimate_final_optimizer.ts'),
        path.resolve(__dirname, '../ultimate_final_optimizer.ts')
    ];
    
    for (const file of potentialFiles) {
        if (fs.existsSync(file) && fs.statSync(file).size > 0) {
            optimizationFile = file;
            break;
        }
    }
    
    if (!optimizationFile) {
        throw new Error('❌ Nie znaleziono pliku optymalizacji!');
    }
    
    logWithTime(`📄 Używam pliku optymalizacji: ${optimizationFile}`);
    
    // Uruchom optymalizację
    const optimizationProcess = spawn('npx', ['ts-node', optimizationFile]);
    
    optimizationProcess.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });
    
    optimizationProcess.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });
    
    return new Promise<void>((resolve, reject) => {
        optimizationProcess.on('close', (code) => {
            if (code === 0) {
                logWithTime('✅ Optymalizacja zakończona pomyślnie!');
                resolve();
            } else {
                logWithTime(`❌ Błąd podczas optymalizacji (kod: ${code})`);
                reject(new Error(`Błąd podczas optymalizacji (kod: ${code})`));
            }
        });
    });
}

// Główna funkcja
async function main() {
    logWithTime('🔍 Rozpoczynam proces optymalizacji strategii handlowych...');
    
    try {
        // Przygotowanie środowiska Python
        await checkPythonEnvironment();
        
        // Test Ray Tune
        await testRayInstallation();
        
        // Test Ray Tune Demo
        await testRayTuneDemo();
        
        // Uruchomienie optymalizacji
        await runOptimization();
        
        logWithTime('🎉 Proces optymalizacji zakończony sukcesem!');
    } catch (error: any) {
        logWithTime(`❌ Wystąpił błąd: ${error.message || String(error)}`);
        process.exit(1);
    }
}

// Uruchom główną funkcję
main();

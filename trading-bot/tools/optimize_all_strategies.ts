/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  optimize_all_strategies.ts - SKRYPT WYKONAWCZY OPTYMALIZACJI
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
const VENV_DIR = path.join(PROJECT_ROOT, '.venv');

// W środowisku WSL używamy Linux ścieżek, nawet jeśli OS to Windows
const isWSL = os.platform() === 'linux' && os.release().toLowerCase().includes('microsoft');
const PYTHON_VENV_PATH = isWSL
    ? path.join(VENV_DIR, 'bin/python')
    : path.join(VENV_DIR, os.platform() === 'win32' ? 'Scripts/python.exe' : 'bin/python');

const REQUIREMENTS_PATH = path.join(PROJECT_ROOT, 'tools/python_archive/requirements.txt');

// Sprawdź czy środowisko wirtualne istnieje i jest aktualne
async function checkPythonEnvironment() {
    try {
        // Sprawdź czy katalog istnieje
        if (!fs.existsSync(VENV_DIR)) {
            logWithTime('⚠️ Wirtualne środowisko Python nie istnieje!');
            logWithTime('🔧 Tworzenie wirtualnego środowiska Python...');
            
            // Utwórz katalog venv
            fs.mkdirSync(VENV_DIR, { recursive: true });
            
            // Dostosuj polecenie do tworzenia środowiska w zależności od platformy
            let setupCommand;
            if (os.platform() === 'win32') {
                setupCommand = `python -m venv "${VENV_DIR}" && "${path.join(VENV_DIR, 'Scripts/pip')}" install --upgrade pip && "${path.join(VENV_DIR, 'Scripts/pip')}" install -r "${REQUIREMENTS_PATH}"`;
            } else if (os.platform() === 'linux') {
                // Dla WSL i Linuxa sprawdź czy mamy python3
                setupCommand = `python3 -m venv "${VENV_DIR}" && "${path.join(VENV_DIR, 'bin/pip')}" install --upgrade pip && "${path.join(VENV_DIR, 'bin/pip')}" install -r "${REQUIREMENTS_PATH}"`;
            } else {
                // MacOS i inne
                setupCommand = `python3 -m venv "${VENV_DIR}" && "${path.join(VENV_DIR, 'bin/pip')}" install --upgrade pip && "${path.join(VENV_DIR, 'bin/pip')}" install -r "${REQUIREMENTS_PATH}"`;
            }
            
            logWithTime(`🔧 Wykonuję: ${setupCommand}`);
            
            // Uruchom komendy sekwencyjnie dla większej niezawodności
            const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
            
            // 1. Utwórz venv
            logWithTime('🔧 Tworzenie wirtualnego środowiska...');
            const createVenvProcess = spawn(pythonCmd, ['-m', 'venv', VENV_DIR]);
            
            await new Promise<void>((resolve, reject) => {
                createVenvProcess.stdout.on('data', (data) => process.stdout.write(data.toString()));
                createVenvProcess.stderr.on('data', (data) => process.stderr.write(data.toString()));
                
                createVenvProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Błąd podczas tworzenia venv (kod: ${code})`));
                    }
                });
            });
            
            // 2. Zainstaluj/aktualizuj pip
            logWithTime('🔧 Aktualizacja pip...');
            const pipPath = os.platform() === 'win32' 
                ? path.join(VENV_DIR, 'Scripts/pip')
                : path.join(VENV_DIR, 'bin/pip');
            
            const upgradePipProcess = spawn(pipPath, ['install', '--upgrade', 'pip']);
            
            await new Promise<void>((resolve, reject) => {
                upgradePipProcess.stdout.on('data', (data) => process.stdout.write(data.toString()));
                upgradePipProcess.stderr.on('data', (data) => process.stderr.write(data.toString()));
                
                upgradePipProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Błąd podczas aktualizacji pip (kod: ${code})`));
                    }
                });
            });
            
            // 3. Zainstaluj wymagane pakiety
            logWithTime('🔧 Instalacja wymaganych pakietów...');
            const installPackagesProcess = spawn(pipPath, ['install', '-r', REQUIREMENTS_PATH]);
            
            await new Promise<void>((resolve, reject) => {
                installPackagesProcess.stdout.on('data', (data) => process.stdout.write(data.toString()));
                installPackagesProcess.stderr.on('data', (data) => process.stderr.write(data.toString()));
                
                installPackagesProcess.on('close', (code) => {
                    if (code === 0) {
                        logWithTime('✅ Środowisko Python utworzone pomyślnie!');
                        resolve();
                    } else {
                        reject(new Error(`Błąd podczas instalacji pakietów (kod: ${code})`));
                    }
                });
            });
        } else {
            logWithTime('✅ Wirtualne środowisko Python istnieje.');
            
            // Sprawdź, czy musimy zaktualizować pakiety
            const requirementsContent = fs.readFileSync(REQUIREMENTS_PATH, 'utf-8');
            const requirementsHash = Buffer.from(requirementsContent).toString('base64');
            const hashFile = path.join(VENV_DIR, '.requirements_hash');
            
            if (fs.existsSync(hashFile)) {
                const savedHash = fs.readFileSync(hashFile, 'utf-8');
                
                if (savedHash !== requirementsHash) {
                    logWithTime('⚠️ Wymagania Python uległy zmianie. Aktualizuję pakiety...');
                    
                    const pipPath = os.platform() === 'win32' 
                        ? path.join(VENV_DIR, 'Scripts/pip')
                        : path.join(VENV_DIR, 'bin/pip');
                    
                    const updateProcess = spawn(pipPath, ['install', '-r', REQUIREMENTS_PATH]);
                    
                    updateProcess.stdout.on('data', (data) => process.stdout.write(data.toString()));
                    updateProcess.stderr.on('data', (data) => process.stderr.write(data.toString()));
                    
                    await new Promise<void>((resolve, reject) => {
                        updateProcess.on('close', (code) => {
                            if (code === 0) {
                                logWithTime('✅ Pakiety zaktualizowane pomyślnie!');
                                fs.writeFileSync(hashFile, requirementsHash);
                                resolve();
                            } else {
                                reject(new Error(`Błąd podczas aktualizacji pakietów (kod: ${code})`));
                            }
                        });
                    });
                } else {
                    logWithTime('✅ Pakiety są aktualne.');
                }
            } else {
                logWithTime('⚠️ Brak informacji o poprzednich wymaganiach. Zapisuję aktualny stan...');
                fs.writeFileSync(hashFile, requirementsHash);
            }
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

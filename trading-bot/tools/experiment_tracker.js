"use strict";
// ============================================================================
//  experiment_tracker.ts - SYSTEM ŚLEDZENIA EKSPERYMENTÓW
//  Ten moduł implementuje zaawansowany system do śledzenia, porównywania
//  i wizualizacji wyników eksperymentów optymalizacyjnych.
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
exports.experimentTracker = exports.ExperimentTracker = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Klasa do zarządzania śledzeniem eksperymentów
 */
class ExperimentTracker {
    constructor(baseDir = 'experiments') {
        this.experimentsCache = {};
        this.experimentsDir = path.join(baseDir, 'data');
        this.dashboardDir = path.join(baseDir, 'dashboard');
        // Utwórz katalogi, jeśli nie istnieją
        if (!fs.existsSync(this.experimentsDir)) {
            fs.mkdirSync(this.experimentsDir, { recursive: true });
        }
        if (!fs.existsSync(this.dashboardDir)) {
            fs.mkdirSync(this.dashboardDir, { recursive: true });
        }
        // Załaduj istniejące eksperymenty do pamięci podręcznej
        this.loadExperimentsToCache();
    }
    /**
     * Tworzy nowy eksperyment
     */
    createExperiment(params) {
        const id = `exp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const metadata = {
            id,
            name: params.name,
            description: params.description || '',
            strategyName: params.strategyName,
            createdAt: Date.now(),
            profile: params.profile.name,
            profileSettings: params.profile,
            status: 'running',
            metrics: {},
            bestParams: {},
            tags: params.tags || []
        };
        // Zapisz metadane
        this.saveExperimentMetadata(metadata);
        // Dodaj do pamięci podręcznej
        this.experimentsCache[id] = metadata;
        return id;
    }
    /**
     * Aktualizuje dane eksperymentu
     */
    updateExperiment(id, update) {
        if (!this.experimentsCache[id]) {
            throw new Error(`Eksperyment o ID ${id} nie istnieje`);
        }
        // Aktualizuj dane w pamięci podręcznej
        this.experimentsCache[id] = {
            ...this.experimentsCache[id],
            ...update
        };
        // Zapisz zaktualizowane metadane
        this.saveExperimentMetadata(this.experimentsCache[id]);
    }
    /**
     * Oznacza eksperyment jako zakończony
     */
    completeExperiment(id, results) {
        if (!this.experimentsCache[id]) {
            throw new Error(`Eksperyment o ID ${id} nie istnieje`);
        }
        const completedAt = Date.now();
        const duration = completedAt - this.experimentsCache[id].createdAt;
        this.updateExperiment(id, {
            status: 'completed',
            completedAt,
            duration,
            metrics: results.metrics,
            bestParams: results.bestParams
        });
        // Aktualizuj dashboard po zakończeniu eksperymentu
        this.updateDashboard();
    }
    /**
     * Oznacza eksperyment jako nieudany
     */
    failExperiment(id, error) {
        if (!this.experimentsCache[id]) {
            throw new Error(`Eksperyment o ID ${id} nie istnieje`);
        }
        const completedAt = Date.now();
        const duration = completedAt - this.experimentsCache[id].createdAt;
        this.updateExperiment(id, {
            status: 'failed',
            completedAt,
            duration,
            error
        });
    }
    /**
     * Zapisuje dane o przebiegu iteracji
     */
    logIteration(id, iteration, params, metrics) {
        if (!this.experimentsCache[id]) {
            throw new Error(`Eksperyment o ID ${id} nie istnieje`);
        }
        const iterationsDir = path.join(this.experimentsDir, id, 'iterations');
        if (!fs.existsSync(iterationsDir)) {
            fs.mkdirSync(iterationsDir, { recursive: true });
        }
        // Zapisz dane iteracji
        fs.writeFileSync(path.join(iterationsDir, `iteration_${iteration}.json`), JSON.stringify({ iteration, params, metrics }, null, 2));
    }
    /**
     * Pobiera metadane eksperymentu
     */
    getExperiment(id) {
        return this.experimentsCache[id] || null;
    }
    /**
     * Wyszukuje eksperymenty według filtrów
     */
    findExperiments(filter = {}) {
        return Object.values(this.experimentsCache).filter(exp => {
            // Filtrowanie po strategii
            if (filter.strategyName && exp.strategyName !== filter.strategyName) {
                return false;
            }
            // Filtrowanie po profilu
            if (filter.profileName && exp.profile !== filter.profileName) {
                return false;
            }
            // Filtrowanie po tagach
            if (filter.tags && filter.tags.length > 0) {
                if (!filter.tags.every(tag => exp.tags.includes(tag))) {
                    return false;
                }
            }
            // Filtrowanie po zakresie dat
            if (filter.dateRange) {
                if (filter.dateRange.from && exp.createdAt < filter.dateRange.from) {
                    return false;
                }
                if (filter.dateRange.to && exp.createdAt > filter.dateRange.to) {
                    return false;
                }
            }
            // Filtrowanie po statusie
            if (filter.status && !filter.status.includes(exp.status)) {
                return false;
            }
            // Filtrowanie po metrykach
            if (filter.metrics && exp.metrics) {
                for (const [metricName, range] of Object.entries(filter.metrics)) {
                    const metricValue = exp.metrics[metricName];
                    if (metricValue === undefined)
                        continue;
                    if (range.min !== undefined && metricValue < range.min) {
                        return false;
                    }
                    if (range.max !== undefined && metricValue > range.max) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
    /**
     * Porównuje kilka eksperymentów
     */
    compareExperiments(ids) {
        const experiments = ids
            .map(id => this.getExperiment(id))
            .filter(exp => exp !== null);
        if (experiments.length === 0) {
            return {};
        }
        // Zebranie wszystkich unikalnych metryk z eksperymentów
        const allMetrics = new Set();
        experiments.forEach(exp => {
            Object.keys(exp.metrics).forEach(metric => allMetrics.add(metric));
        });
        // Przygotowanie danych do porównania
        const comparison = {
            experiments: experiments.map(exp => ({
                id: exp.id,
                name: exp.name,
                strategyName: exp.strategyName,
                profile: exp.profile,
                createdAt: exp.createdAt,
                status: exp.status
            })),
            metrics: {},
            parameters: {}
        };
        // Porównanie metryk
        Array.from(allMetrics).forEach(metric => {
            comparison.metrics[metric] = experiments.map(exp => ({
                experimentId: exp.id,
                experimentName: exp.name,
                value: exp.metrics[metric] || null
            }));
        });
        // Porównanie parametrów
        const allParams = new Set();
        experiments.forEach(exp => {
            Object.keys(exp.bestParams).forEach(param => allParams.add(param));
        });
        Array.from(allParams).forEach(param => {
            comparison.parameters[param] = experiments.map(exp => ({
                experimentId: exp.id,
                experimentName: exp.name,
                value: exp.bestParams[param] !== undefined ? exp.bestParams[param] : null
            }));
        });
        return comparison;
    }
    /**
     * Tworzy raport HTML dla eksperymentu
     */
    generateExperimentReport(id) {
        const experiment = this.getExperiment(id);
        if (!experiment) {
            throw new Error(`Eksperyment o ID ${id} nie istnieje`);
        }
        const reportDir = path.join(this.dashboardDir, 'reports', id);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        // Wczytanie danych iteracji
        const iterationsDir = path.join(this.experimentsDir, id, 'iterations');
        const iterations = [];
        if (fs.existsSync(iterationsDir)) {
            const files = fs.readdirSync(iterationsDir)
                .filter(file => file.startsWith('iteration_') && file.endsWith('.json'))
                .sort((a, b) => {
                const numA = parseInt(a.replace('iteration_', '').replace('.json', ''));
                const numB = parseInt(b.replace('iteration_', '').replace('.json', ''));
                return numA - numB;
            });
            for (const file of files) {
                const content = fs.readFileSync(path.join(iterationsDir, file), 'utf8');
                try {
                    const data = JSON.parse(content);
                    iterations.push(data);
                }
                catch (e) {
                    console.error(`Błąd parsowania pliku ${file}: ${e}`);
                }
            }
        }
        // Generowanie HTML
        const html = this.generateReportHtml(experiment, iterations);
        const reportPath = path.join(reportDir, 'report.html');
        fs.writeFileSync(reportPath, html);
        return reportPath;
    }
    /**
     * Aktualizuje dashboard z przeglądem wszystkich eksperymentów
     */
    updateDashboard() {
        const dashboardPath = path.join(this.dashboardDir, 'index.html');
        const experiments = Object.values(this.experimentsCache);
        // Sortowanie eksperymentów: najpierw zakończone, potem po dacie utworzenia (od najnowszych)
        experiments.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed')
                return -1;
            if (a.status !== 'completed' && b.status === 'completed')
                return 1;
            return b.createdAt - a.createdAt;
        });
        const html = this.generateDashboardHtml(experiments);
        fs.writeFileSync(dashboardPath, html);
    }
    /**
     * Ładuje istniejące eksperymenty do pamięci podręcznej
     */
    loadExperimentsToCache() {
        if (!fs.existsSync(this.experimentsDir))
            return;
        const items = fs.readdirSync(this.experimentsDir, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                const metadataPath = path.join(this.experimentsDir, item.name, 'metadata.json');
                if (fs.existsSync(metadataPath)) {
                    try {
                        const content = fs.readFileSync(metadataPath, 'utf8');
                        const metadata = JSON.parse(content);
                        this.experimentsCache[metadata.id] = metadata;
                    }
                    catch (e) {
                        console.error(`Błąd ładowania metadanych dla ${item.name}: ${e}`);
                    }
                }
            }
        }
    }
    /**
     * Zapisuje metadane eksperymentu
     */
    saveExperimentMetadata(metadata) {
        const experimentDir = path.join(this.experimentsDir, metadata.id);
        if (!fs.existsSync(experimentDir)) {
            fs.mkdirSync(experimentDir, { recursive: true });
        }
        fs.writeFileSync(path.join(experimentDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    }
    /**
     * Generuje HTML dla raportu eksperymentu
     */
    generateReportHtml(experiment, iterations) {
        // Generowanie danych do wykresów
        const iterationNumbers = iterations.map(it => it.iteration);
        const metricNames = iterations.length > 0 && iterations[0].metrics
            ? Object.keys(iterations[0].metrics)
            : [];
        const metricData = {};
        metricNames.forEach(metric => {
            metricData[metric] = iterations.map(it => it.metrics[metric] || 0);
        });
        // Przygotowanie danych parametrów
        const paramNames = iterations.length > 0 && iterations[0].params
            ? Object.keys(iterations[0].params)
            : [];
        const paramData = {};
        paramNames.forEach(param => {
            paramData[param] = iterations.map(it => it.params[param]);
        });
        // Formatowanie czasu
        const formatDate = (timestamp) => {
            return new Date(timestamp).toLocaleString();
        };
        const formatDuration = (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        };
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Raport eksperymentu: ${experiment.name}</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
                .section { margin-bottom: 40px; }
                h1, h2, h3 { color: #333; }
                .metrics-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .metrics-table th, .metrics-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .metrics-table th { background-color: #f2f2f2; }
                .status-running { color: #1976d2; }
                .status-completed { color: #388e3c; }
                .status-failed { color: #d32f2f; }
                .status-interrupted { color: #f57c00; }
                .chart-container { width: 100%; height: 400px; margin-bottom: 30px; }
                .tag { display: inline-block; background-color: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 4px; margin-right: 5px; }
                .params-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .params-table th, .params-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .params-table th { background-color: #f2f2f2; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Raport eksperymentu: ${experiment.name}</h1>
                    <p><strong>ID:</strong> ${experiment.id}</p>
                    <p><strong>Strategia:</strong> ${experiment.strategyName}</p>
                    <p><strong>Profil:</strong> ${experiment.profile}</p>
                    <p><strong>Status:</strong> <span class="status-${experiment.status}">${experiment.status}</span></p>
                    <p><strong>Utworzony:</strong> ${formatDate(experiment.createdAt)}</p>
                    ${experiment.completedAt ? `<p><strong>Zakończony:</strong> ${formatDate(experiment.completedAt)}</p>` : ''}
                    ${experiment.duration ? `<p><strong>Czas trwania:</strong> ${formatDuration(experiment.duration)}</p>` : ''}
                    ${experiment.error ? `<p><strong>Błąd:</strong> <span style="color: red;">${experiment.error}</span></p>` : ''}
                    <p><strong>Tagi:</strong> ${experiment.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                </div>
                
                ${experiment.description ? `
                <div class="section">
                    <h2>Opis</h2>
                    <p>${experiment.description}</p>
                </div>
                ` : ''}
                
                <div class="section">
                    <h2>Ustawienia profilu</h2>
                    <table class="params-table">
                        <tr>
                            <th>Parametr</th>
                            <th>Wartość</th>
                        </tr>
                        <tr>
                            <td>Liczba prób</td>
                            <td>${experiment.profileSettings.trials}</td>
                        </tr>
                        <tr>
                            <td>Walk-forward</td>
                            <td>${experiment.profileSettings.walkForward ? 'Tak' : 'Nie'}</td>
                        </tr>
                        ${experiment.profileSettings.walkForward ? `
                        <tr>
                            <td>Liczba okresów walk-forward</td>
                            <td>${experiment.profileSettings.walkForwardPeriods}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td>Główna metryka</td>
                            <td>${experiment.profileSettings.primaryMetric}</td>
                        </tr>
                        <tr>
                            <td>Dodatkowe metryki</td>
                            <td>${experiment.profileSettings.secondaryMetrics.join(', ')}</td>
                        </tr>
                    </table>
                </div>
                
                ${experiment.status === 'completed' ? `
                <div class="section">
                    <h2>Najlepsze parametry</h2>
                    <table class="params-table">
                        <tr>
                            <th>Parametr</th>
                            <th>Wartość</th>
                        </tr>
                        ${Object.entries(experiment.bestParams).map(([key, value]) => `
                        <tr>
                            <td>${key}</td>
                            <td>${value}</td>
                        </tr>
                        `).join('')}
                    </table>
                </div>
                
                <div class="section">
                    <h2>Wyniki metryk</h2>
                    <table class="metrics-table">
                        <tr>
                            <th>Metryka</th>
                            <th>Wartość</th>
                        </tr>
                        ${Object.entries(experiment.metrics).map(([key, value]) => `
                        <tr>
                            <td>${key}</td>
                            <td>${typeof value === 'number' ? value.toFixed(4) : value}</td>
                        </tr>
                        `).join('')}
                    </table>
                </div>
                ` : ''}
                
                ${iterations.length > 0 ? `
                <div class="section">
                    <h2>Przebieg optymalizacji</h2>
                    <p>Liczba zarejestrowanych iteracji: ${iterations.length}</p>
                    
                    ${metricNames.length > 0 ? `
                    <h3>Metryki w czasie</h3>
                    ${metricNames.map(metric => `
                    <div class="chart-container">
                        <canvas id="metric_${metric}_chart"></canvas>
                    </div>
                    `).join('')}
                    ` : ''}
                    
                    ${paramNames.length > 0 ? `
                    <h3>Parametry vs Główna metryka</h3>
                    ${paramNames.map(param => `
                    <div class="chart-container">
                        <canvas id="param_${param}_chart"></canvas>
                    </div>
                    `).join('')}
                    ` : ''}
                </div>
                
                <script>
                    // Dane do wykresów
                    const iterationNumbers = ${JSON.stringify(iterationNumbers)};
                    const metricData = ${JSON.stringify(metricData)};
                    const paramData = ${JSON.stringify(paramData)};
                    const primaryMetric = '${experiment.profileSettings.primaryMetric}';
                    
                    // Generowanie wykresów metryk
                    ${metricNames.map(metric => `
                    new Chart(document.getElementById('metric_${metric}_chart'), {
                        type: 'line',
                        data: {
                            labels: iterationNumbers,
                            datasets: [{
                                label: '${metric}',
                                data: metricData['${metric}'],
                                borderColor: '${metric === experiment.profileSettings.primaryMetric ? 'rgb(54, 162, 235)' : 'rgb(75, 192, 192)'}',
                                backgroundColor: '${metric === experiment.profileSettings.primaryMetric ? 'rgba(54, 162, 235, 0.2)' : 'rgba(75, 192, 192, 0.2)'}',
                                tension: 0.1,
                                fill: false
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Wartość ${metric} w kolejnych iteracjach'
                                }
                            },
                            scales: {
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Iteracja'
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: '${metric}'
                                    }
                                }
                            }
                        }
                    });
                    `).join('')}
                    
                    // Generowanie wykresów parametrów
                    ${paramNames.map(param => `
                    new Chart(document.getElementById('param_${param}_chart'), {
                        type: 'scatter',
                        data: {
                            datasets: [{
                                label: '${param} vs ${experiment.profileSettings.primaryMetric}',
                                data: paramData['${param}'].map((value, index) => ({
                                    x: value,
                                    y: metricData[primaryMetric][index]
                                })),
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                pointRadius: 5,
                                pointHoverRadius: 8
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Wpływ parametru ${param} na ${experiment.profileSettings.primaryMetric}'
                                }
                            },
                            scales: {
                                x: {
                                    title: {
                                        display: true,
                                        text: '${param}'
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: '${experiment.profileSettings.primaryMetric}'
                                    }
                                }
                            }
                        }
                    });
                    `).join('')}
                </script>
                ` : ''}
            </div>
        </body>
        </html>
        `;
    }
    /**
     * Generuje HTML dla głównego dashboardu
     */
    generateDashboardHtml(experiments) {
        // Zliczanie statystyk
        const totalCount = experiments.length;
        const completedCount = experiments.filter(exp => exp.status === 'completed').length;
        const runningCount = experiments.filter(exp => exp.status === 'running').length;
        const failedCount = experiments.filter(exp => exp.status === 'failed').length;
        // Grupowanie po strategiach i profilach
        const strategyCounts = {};
        const profileCounts = {};
        experiments.forEach(exp => {
            strategyCounts[exp.strategyName] = (strategyCounts[exp.strategyName] || 0) + 1;
            profileCounts[exp.profile] = (profileCounts[exp.profile] || 0) + 1;
        });
        // Formatowanie czasu
        const formatDate = (timestamp) => {
            return new Date(timestamp).toLocaleString();
        };
        const formatDuration = (ms) => {
            if (!ms)
                return 'N/A';
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        };
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dashboard Eksperymentów Optymalizacyjnych</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .container { max-width: 1400px; margin: 0 auto; }
                .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
                .filters { background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .stats-row { display: flex; gap: 20px; margin-bottom: 20px; }
                .stat-box { flex: 1; background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
                .stat-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .experiments-table { width: 100%; border-collapse: collapse; }
                .experiments-table th, .experiments-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .experiments-table th { background-color: #f2f2f2; position: sticky; top: 0; }
                .experiments-table tr:hover { background-color: #f5f5f5; }
                .status-running { color: #1976d2; }
                .status-completed { color: #388e3c; }
                .status-failed { color: #d32f2f; }
                .status-interrupted { color: #f57c00; }
                .tag { display: inline-block; background-color: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 4px; margin-right: 5px; }
                .comparison-form { margin-bottom: 20px; }
                .action-btn { background-color: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
                .action-btn:hover { background-color: #45a049; }
                .table-container { max-height: 600px; overflow-y: auto; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Dashboard Eksperymentów Optymalizacyjnych</h1>
                    <p>Centralne miejsce do śledzenia i porównywania eksperymentów optymalizacyjnych strategii tradingowych.</p>
                </div>
                
                <div class="filters">
                    <h2>Filtry</h2>
                    <form id="filter-form">
                        <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <label for="filter-strategy">Strategia:</label>
                                <select id="filter-strategy" style="width: 100%; padding: 8px;">
                                    <option value="">Wszystkie</option>
                                    ${Object.entries(strategyCounts).map(([strategy, count]) => `<option value="${strategy}">${strategy} (${count})</option>`).join('')}
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label for="filter-profile">Profil:</label>
                                <select id="filter-profile" style="width: 100%; padding: 8px;">
                                    <option value="">Wszystkie</option>
                                    ${Object.entries(profileCounts).map(([profile, count]) => `<option value="${profile}">${profile} (${count})</option>`).join('')}
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label for="filter-status">Status:</label>
                                <select id="filter-status" style="width: 100%; padding: 8px;">
                                    <option value="">Wszystkie</option>
                                    <option value="running">Uruchomione (${runningCount})</option>
                                    <option value="completed">Zakończone (${completedCount})</option>
                                    <option value="failed">Nieudane (${failedCount})</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="action-btn">Zastosuj filtry</button>
                    </form>
                </div>
                
                <div class="stats-row">
                    <div class="stat-box">
                        <h3>Łącznie eksperymentów</h3>
                        <div class="stat-value">${totalCount}</div>
                    </div>
                    <div class="stat-box">
                        <h3>Zakończone</h3>
                        <div class="stat-value">${completedCount}</div>
                    </div>
                    <div class="stat-box">
                        <h3>W trakcie</h3>
                        <div class="stat-value">${runningCount}</div>
                    </div>
                    <div class="stat-box">
                        <h3>Nieudane</h3>
                        <div class="stat-value">${failedCount}</div>
                    </div>
                </div>
                
                <div class="comparison-form">
                    <h2>Porównaj eksperymenty</h2>
                    <form id="compare-form">
                        <p>Wybierz eksperymenty do porównania zaznaczając checkbox w tabeli poniżej.</p>
                        <button type="submit" class="action-btn" id="compare-btn" disabled>Porównaj wybrane</button>
                    </form>
                </div>
                
                <h2>Lista eksperymentów</h2>
                <div class="table-container">
                    <table class="experiments-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="select-all"></th>
                                <th>ID</th>
                                <th>Nazwa</th>
                                <th>Strategia</th>
                                <th>Profil</th>
                                <th>Status</th>
                                <th>Utworzony</th>
                                <th>Czas trwania</th>
                                <th>Główna metryka</th>
                                <th>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${experiments.map(exp => `
                            <tr data-id="${exp.id}" class="experiment-row">
                                <td><input type="checkbox" class="exp-checkbox" data-id="${exp.id}"></td>
                                <td>${exp.id}</td>
                                <td>${exp.name}</td>
                                <td>${exp.strategyName}</td>
                                <td>${exp.profile}</td>
                                <td><span class="status-${exp.status}">${exp.status}</span></td>
                                <td>${formatDate(exp.createdAt)}</td>
                                <td>${formatDuration(exp.duration)}</td>
                                <td>${exp.status === 'completed' && exp.metrics[exp.profileSettings.primaryMetric] !== undefined
            ? exp.metrics[exp.profileSettings.primaryMetric]?.toFixed(4)
            : 'N/A'}</td>
                                <td>
                                    <a href="reports/${exp.id}/report.html" target="_blank">Szczegóły</a>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <script>
                // Obsługa zaznaczania eksperymentów do porównania
                document.addEventListener('DOMContentLoaded', function() {
                    const selectAll = document.getElementById('select-all');
                    const checkboxes = document.querySelectorAll('.exp-checkbox');
                    const compareBtn = document.getElementById('compare-btn');
                    
                    // Zaznaczanie/odznaczanie wszystkich
                    selectAll.addEventListener('change', function() {
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = selectAll.checked;
                        });
                        updateCompareButton();
                    });
                    
                    // Aktualizacja przycisku porównania
                    checkboxes.forEach(checkbox => {
                        checkbox.addEventListener('change', updateCompareButton);
                    });
                    
                    function updateCompareButton() {
                        const selectedCount = document.querySelectorAll('.exp-checkbox:checked').length;
                        compareBtn.disabled = selectedCount < 2;
                        compareBtn.textContent = \`Porównaj wybrane (\${selectedCount})\`;
                    }
                    
                    // Obsługa formularza porównania
                    document.getElementById('compare-form').addEventListener('submit', function(e) {
                        e.preventDefault();
                        const selectedIds = Array.from(document.querySelectorAll('.exp-checkbox:checked'))
                            .map(checkbox => checkbox.getAttribute('data-id'));
                        
                        if (selectedIds.length >= 2) {
                            // Tutaj przekierowanie do strony porównania
                            const compareUrl = 'compare.html?ids=' + selectedIds.join(',');
                            window.open(compareUrl, '_blank');
                        }
                    });
                    
                    // Obsługa filtrowania
                    document.getElementById('filter-form').addEventListener('submit', function(e) {
                        e.preventDefault();
                        
                        const strategyFilter = document.getElementById('filter-strategy').value;
                        const profileFilter = document.getElementById('filter-profile').value;
                        const statusFilter = document.getElementById('filter-status').value;
                        
                        const rows = document.querySelectorAll('.experiment-row');
                        
                        rows.forEach(row => {
                            const strategy = row.children[3].textContent;
                            const profile = row.children[4].textContent;
                            const status = row.children[5].textContent;
                            
                            let visible = true;
                            
                            if (strategyFilter && strategy !== strategyFilter) {
                                visible = false;
                            }
                            
                            if (profileFilter && profile !== profileFilter) {
                                visible = false;
                            }
                            
                            if (statusFilter && status !== statusFilter) {
                                visible = false;
                            }
                            
                            row.style.display = visible ? '' : 'none';
                        });
                    });
                });
            </script>
        </body>
        </html>
        `;
    }
}
exports.ExperimentTracker = ExperimentTracker;
// Eksportujemy singleton trackera eksperymentów
exports.experimentTracker = new ExperimentTracker();

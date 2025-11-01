"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  experiment_management.ts - KOMPONENT DO ZARZĄDZANIA EKSPERYMENTAMI
//  Ten plik zawiera komponenty UI do zarządzania i przeglądania eksperymentów
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentManager = void 0;
const experiment_tracker_1 = require("./experiment_tracker");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const open_1 = __importDefault(require("open"));
/**
 * Klasa zarządzająca interfejsem eksperymentów
 */
class ExperimentManager {
    /**
     * Otwiera dashboard eksperymentów w domyślnej przeglądarce
     */
    static openDashboard() {
        // Upewnij się, że dashboard został zaktualizowany
        experiment_tracker_1.experimentTracker.updateDashboard();
        // Pobierz ścieżkę do pliku dashboard
        const dashboardPath = path.join('experiments', 'dashboard', 'index.html');
        // Sprawdź czy plik istnieje
        if (!fs.existsSync(dashboardPath)) {
            console.error(`[ExperimentManager] Dashboard nie istnieje: ${dashboardPath}`);
            return;
        }
        // Otwórz dashboard w przeglądarce
        const absolutePath = path.resolve(dashboardPath);
        (0, open_1.default)(absolutePath);
        console.log(`[ExperimentManager] Otwarto dashboard: ${absolutePath}`);
    }
    /**
     * Otwiera raport konkretnego eksperymentu
     */
    static openExperimentReport(experimentId) {
        // Pobierz metadane eksperymentu
        const experiment = experiment_tracker_1.experimentTracker.getExperiment(experimentId);
        if (!experiment) {
            console.error(`[ExperimentManager] Eksperyment o ID ${experimentId} nie istnieje`);
            return;
        }
        // Wygeneruj/zaktualizuj raport
        const reportPath = experiment_tracker_1.experimentTracker.generateExperimentReport(experimentId);
        // Otwórz raport w przeglądarce
        (0, open_1.default)(reportPath);
        console.log(`[ExperimentManager] Otwarto raport eksperymentu: ${reportPath}`);
    }
    /**
     * Porównuje wybrane eksperymenty i otwiera raport porównawczy
     */
    static compareExperiments(experimentIds) {
        if (experimentIds.length < 2) {
            console.error('[ExperimentManager] Do porównania potrzebne są co najmniej 2 eksperymenty');
            return;
        }
        // Sprawdź czy wszystkie eksperymenty istnieją
        const experiments = experimentIds.map(id => experiment_tracker_1.experimentTracker.getExperiment(id))
            .filter(exp => exp !== null);
        if (experiments.length !== experimentIds.length) {
            console.error('[ExperimentManager] Niektóre z podanych ID eksperymentów nie istnieją');
            return;
        }
        // Pobierz dane porównawcze
        const comparison = experiment_tracker_1.experimentTracker.compareExperiments(experimentIds);
        // Stwórz tymczasowy plik porównawczy
        const compareDir = path.join('experiments', 'dashboard', 'compare');
        if (!fs.existsSync(compareDir)) {
            fs.mkdirSync(compareDir, { recursive: true });
        }
        const compareFile = path.join(compareDir, `compare_${Date.now()}.html`);
        // Generuj HTML dla porównania
        const html = ExperimentManager.generateComparisonHtml(experiments, comparison);
        fs.writeFileSync(compareFile, html);
        // Otwórz plik porównania
        (0, open_1.default)(compareFile);
        console.log(`[ExperimentManager] Otwarto porównanie eksperymentów: ${compareFile}`);
    }
    /**
     * Wyszukuje eksperymenty według filtrów
     */
    static findExperiments(filter = {}) {
        return experiment_tracker_1.experimentTracker.findExperiments(filter);
    }
    /**
     * Generuje HTML dla raportu porównawczego
     */
    static generateComparisonHtml(experiments, comparison) {
        // Formatowanie daty
        const formatDate = (timestamp) => {
            return new Date(timestamp).toLocaleString();
        };
        const experimentNames = experiments.map(e => e.name);
        const strategyNames = [...new Set(experiments.map(e => e.strategyName))];
        // Przygotuj kolory dla wykresów
        const colors = [
            'rgb(54, 162, 235)', // niebieski
            'rgb(255, 99, 132)', // czerwony
            'rgb(75, 192, 192)', // turkusowy
            'rgb(255, 159, 64)', // pomarańczowy
            'rgb(153, 102, 255)', // fioletowy
            'rgb(255, 205, 86)', // żółty
            'rgb(201, 203, 207)', // szary
            'rgb(0, 128, 0)', // zielony
            'rgb(139, 69, 19)', // brązowy
            'rgb(0, 0, 128)' // granatowy
        ];
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Porównanie eksperymentów</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
                .section { margin-bottom: 40px; }
                h1, h2, h3 { color: #333; }
                .chart-container { width: 100%; height: 400px; margin-bottom: 30px; }
                .comparison-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .comparison-table th, .comparison-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .comparison-table th { background-color: #f2f2f2; }
                .comparison-table tr:nth-child(even) { background-color: #f9f9f9; }
                .best-value { font-weight: bold; color: #388e3c; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Porównanie eksperymentów</h1>
                    <p><strong>Porównywane eksperymenty:</strong> ${experimentNames.join(', ')}</p>
                    <p><strong>Strategie:</strong> ${strategyNames.join(', ')}</p>
                    <p><strong>Data porównania:</strong> ${formatDate(Date.now())}</p>
                </div>
                
                <div class="section">
                    <h2>Metryki</h2>
                    <table class="comparison-table">
                        <tr>
                            <th>Metryka</th>
                            ${experiments.map(exp => `<th>${exp.name}</th>`).join('')}
                        </tr>
                        ${Object.keys(comparison.metrics).map(metric => {
            // Znajdź najlepszą wartość dla metryki
            const values = comparison.metrics[metric].map((m) => m.value).filter((v) => v !== null);
            const bestValue = values.length > 0 ? Math.max(...values) : null;
            return `
                            <tr>
                                <td>${metric}</td>
                                ${comparison.metrics[metric].map((m) => `
                                    <td class="${m.value !== null && m.value === bestValue ? 'best-value' : ''}">
                                        ${m.value !== null ? m.value.toFixed(4) : 'N/A'}
                                    </td>
                                `).join('')}
                            </tr>
                            `;
        }).join('')}
                    </table>
                    
                    ${Object.keys(comparison.metrics).map((metric, index) => `
                    <div class="chart-container">
                        <canvas id="metric_${index}_chart"></canvas>
                    </div>
                    `).join('')}
                </div>
                
                <div class="section">
                    <h2>Parametry</h2>
                    <table class="comparison-table">
                        <tr>
                            <th>Parametr</th>
                            ${experiments.map(exp => `<th>${exp.name}</th>`).join('')}
                        </tr>
                        ${Object.keys(comparison.parameters).map(param => `
                        <tr>
                            <td>${param}</td>
                            ${comparison.parameters[param].map((p) => `
                                <td>${p.value !== null ? p.value : 'N/A'}</td>
                            `).join('')}
                        </tr>
                        `).join('')}
                    </table>
                </div>
                
                <script>
                    // Generowanie wykresów metryk
                    ${Object.keys(comparison.metrics).map((metric, index) => `
                    new Chart(document.getElementById('metric_${index}_chart'), {
                        type: 'bar',
                        data: {
                            labels: [${experiments.map(e => `'${e.name}'`).join(', ')}],
                            datasets: [{
                                label: '${metric}',
                                data: [${comparison.metrics[metric].map((m) => m.value !== null ? m.value : 'null').join(', ')}],
                                backgroundColor: [${experiments.map((_, i) => `'${colors[i % colors.length]}'`).join(', ')}],
                                borderColor: [${experiments.map((_, i) => `'${colors[i % colors.length]}'`).join(', ')}],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Porównanie ${metric}'
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: false
                                }
                            }
                        }
                    });
                    `).join('')}
                </script>
            </div>
        </body>
        </html>
        `;
    }
}
exports.ExperimentManager = ExperimentManager;

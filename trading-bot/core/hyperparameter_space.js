"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * ============================================================================
 * SYSTEM PRZESTRZENI HIPERPARAMETRÓW
 *
 * Ten moduł implementuje zaawansowany system do definiowania i zarządzania
 * przestrzeniami poszukiwań dla optymalizacji hiperparametrów strategii tradingowych.
 * ============================================================================
 */
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
exports.hyperparameterSpaceManager = exports.HyperparameterSpaceManager = exports.SamplingStrategy = exports.TransformationType = exports.ParameterType = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Typ parametru w przestrzeni hiperparametrów
 */
var ParameterType;
(function (ParameterType) {
    ParameterType["INTEGER"] = "integer";
    ParameterType["FLOAT"] = "float";
    ParameterType["CATEGORICAL"] = "categorical";
    ParameterType["BOOLEAN"] = "boolean";
    ParameterType["CONDITIONAL"] = "conditional";
    ParameterType["CHOICE"] = "choice"; // Wybór z listy opcji
})(ParameterType || (exports.ParameterType = ParameterType = {}));
/**
 * Typ transformacji parametru
 */
var TransformationType;
(function (TransformationType) {
    TransformationType["NONE"] = "none";
    TransformationType["LOG"] = "log";
    TransformationType["LOG10"] = "log10";
    TransformationType["SQRT"] = "sqrt";
    TransformationType["SQUARE"] = "square";
    TransformationType["NORMALIZE"] = "normalize";
    TransformationType["STANDARDIZE"] = "standardize"; // Standaryzacja z-score
})(TransformationType || (exports.TransformationType = TransformationType = {}));
/**
 * Strategia próbkowania parametrów
 */
var SamplingStrategy;
(function (SamplingStrategy) {
    SamplingStrategy["UNIFORM"] = "uniform";
    SamplingStrategy["LOG_UNIFORM"] = "log_uniform";
    SamplingStrategy["NORMAL"] = "normal";
    SamplingStrategy["CHOICE"] = "choice";
    SamplingStrategy["GRID"] = "grid"; // Próbkowanie siatki
})(SamplingStrategy || (exports.SamplingStrategy = SamplingStrategy = {}));
/**
 * Klasa zarządzająca przestrzeniami hiperparametrów
 */
class HyperparameterSpaceManager {
    constructor(baseDirectory = 'hyperparameter_spaces') {
        this.spaces = new Map();
        this.spacesDirectory = path.join(baseDirectory, 'definitions');
        this.samplesDirectory = path.join(baseDirectory, 'samples');
        // Utwórz katalogi jeśli nie istnieją
        if (!fs.existsSync(this.spacesDirectory)) {
            fs.mkdirSync(this.spacesDirectory, { recursive: true });
        }
        if (!fs.existsSync(this.samplesDirectory)) {
            fs.mkdirSync(this.samplesDirectory, { recursive: true });
        }
        // Załaduj istniejące przestrzenie
        this.loadSpaces();
    }
    /**
     * Tworzy nową przestrzeń hiperparametrów
     */
    createSpace(space) {
        const spaceWithTimestamps = {
            ...space,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        // Walidacja przestrzeni
        this.validateSpace(spaceWithTimestamps);
        // Zapisz przestrzeń
        this.spaces.set(space.name, spaceWithTimestamps);
        this.saveSpace(spaceWithTimestamps);
        console.log(`✅ Utworzono przestrzeń hiperparametrów: ${space.name}`);
        console.log(`📊 Parametrów: ${space.parameters.length}`);
        return space.name;
    }
    /**
     * Pobiera przestrzeń hiperparametrów
     */
    getSpace(name) {
        return this.spaces.get(name) || null;
    }
    /**
     * Aktualizuje przestrzeń hiperparametrów
     */
    updateSpace(name, updates) {
        const space = this.spaces.get(name);
        if (!space) {
            throw new Error(`Przestrzeń ${name} nie istnieje`);
        }
        const updatedSpace = {
            ...space,
            ...updates,
            updatedAt: Date.now()
        };
        this.validateSpace(updatedSpace);
        this.spaces.set(name, updatedSpace);
        this.saveSpace(updatedSpace);
        console.log(`✅ Zaktualizowano przestrzeń: ${name}`);
    }
    /**
     * Generuje próbkę parametrów z przestrzeni
     */
    sampleParameters(spaceName, method = SamplingStrategy.UNIFORM) {
        const space = this.getSpace(spaceName);
        if (!space) {
            throw new Error(`Przestrzeń ${spaceName} nie istnieje`);
        }
        const sampleId = `sample_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const parameters = {};
        const transformedParameters = {};
        console.log(`🎲 Generowanie próbki parametrów dla ${spaceName}...`);
        // Generuj wartości dla każdego parametru
        for (const param of space.parameters) {
            // Sprawdź warunki aktywacji
            if (!this.isParameterActive(param, parameters)) {
                continue;
            }
            const value = this.generateParameterValue(param, method);
            const transformedValue = this.transformParameter(param, value);
            parameters[param.name] = value;
            transformedParameters[param.name] = transformedValue;
            console.log(`  ${param.name}: ${value} ${transformedValue !== value ? `-> ${transformedValue}` : ''}`);
        }
        // Waliduj próbkę względem ograniczeń
        const validationResult = this.validateSample(space, parameters);
        const sample = {
            id: sampleId,
            spaceId: spaceName,
            parameters,
            transformedParameters,
            generationMethod: method,
            timestamp: Date.now(),
            isValid: validationResult.isValid,
            validationErrors: validationResult.errors
        };
        // Zapisz próbkę
        this.saveSample(sample);
        console.log(`${sample.isValid ? '✅' : '❌'} Próbka: ${sampleId} ${sample.isValid ? 'VALID' : 'INVALID'}`);
        return sample;
    }
    /**
     * Generuje wiele próbek parametrów
     */
    sampleMultiple(spaceName, count, method = SamplingStrategy.UNIFORM) {
        console.log(`🎯 Generowanie ${count} próbek dla ${spaceName}...`);
        const samples = [];
        let validSamples = 0;
        for (let i = 0; i < count; i++) {
            try {
                const sample = this.sampleParameters(spaceName, method);
                samples.push(sample);
                if (sample.isValid) {
                    validSamples++;
                }
                // Progress co 10 próbek
                if ((i + 1) % 10 === 0) {
                    console.log(`📈 Postęp: ${i + 1}/${count} (${validSamples} valid)`);
                }
            }
            catch (error) {
                console.error(`❌ Błąd generacji próbki ${i + 1}:`, error);
            }
        }
        console.log(`🎉 Wygenerowano ${samples.length} próbek (${validSamples} valid, ${samples.length - validSamples} invalid)`);
        return samples;
    }
    /**
     * Generuje wartość dla konkretnego parametru
     */
    generateParameterValue(param, method) {
        switch (param.type) {
            case ParameterType.INTEGER:
                return this.generateIntegerValue(param, method);
            case ParameterType.FLOAT:
                return this.generateFloatValue(param, method);
            case ParameterType.CATEGORICAL:
            case ParameterType.CHOICE:
                return this.generateCategoricalValue(param);
            case ParameterType.BOOLEAN:
                return Math.random() < 0.5;
            default:
                throw new Error(`Nieobsługiwany typ parametru: ${param.type}`);
        }
    }
    /**
     * Generuje wartość całkowitą
     */
    generateIntegerValue(param, method) {
        if (param.min === undefined || param.max === undefined) {
            throw new Error(`Parametr ${param.name}: min i max są wymagane dla typu INTEGER`);
        }
        const min = param.min;
        const max = param.max;
        const step = param.step || 1;
        switch (method) {
            case SamplingStrategy.UNIFORM:
                const range = Math.floor((max - min) / step) + 1;
                return min + Math.floor(Math.random() * range) * step;
            case SamplingStrategy.LOG_UNIFORM:
                if (min <= 0) {
                    throw new Error(`Log-uniform sampling wymaga min > 0 dla ${param.name}`);
                }
                const logMin = Math.log(min);
                const logMax = Math.log(max);
                const logValue = logMin + Math.random() * (logMax - logMin);
                return Math.round(Math.exp(logValue) / step) * step;
            default:
                return min + Math.floor(Math.random() * ((max - min) / step + 1)) * step;
        }
    }
    /**
     * Generuje wartość zmiennoprzecinkową
     */
    generateFloatValue(param, method) {
        if (param.min === undefined || param.max === undefined) {
            throw new Error(`Parametr ${param.name}: min i max są wymagane dla typu FLOAT`);
        }
        const min = param.min;
        const max = param.max;
        switch (method) {
            case SamplingStrategy.UNIFORM:
                return min + Math.random() * (max - min);
            case SamplingStrategy.LOG_UNIFORM:
                if (min <= 0) {
                    throw new Error(`Log-uniform sampling wymaga min > 0 dla ${param.name}`);
                }
                const logMin = Math.log(min);
                const logMax = Math.log(max);
                const logValue = logMin + Math.random() * (logMax - logMin);
                return Math.exp(logValue);
            case SamplingStrategy.NORMAL:
                // Box-Muller transform dla rozkładu normalnego
                const u1 = Math.random();
                const u2 = Math.random();
                const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                const mean = (min + max) / 2;
                const std = (max - min) / 6; // 99.7% wartości w przedziale
                return Math.max(min, Math.min(max, mean + z0 * std));
            default:
                return min + Math.random() * (max - min);
        }
    }
    /**
     * Generuje wartość kategoryczną
     */
    generateCategoricalValue(param) {
        if (!param.choices || param.choices.length === 0) {
            throw new Error(`Parametr ${param.name}: choices są wymagane dla typu CATEGORICAL/CHOICE`);
        }
        const randomIndex = Math.floor(Math.random() * param.choices.length);
        return param.choices[randomIndex];
    }
    /**
     * Transformuje wartość parametru
     */
    transformParameter(param, value) {
        if (!param.transformation || param.transformation === TransformationType.NONE) {
            return value;
        }
        if (typeof value !== 'number') {
            return value; // Transformacje tylko dla wartości numerycznych
        }
        switch (param.transformation) {
            case TransformationType.LOG:
                return value > 0 ? Math.log(value) : value;
            case TransformationType.LOG10:
                return value > 0 ? Math.log10(value) : value;
            case TransformationType.SQRT:
                return value >= 0 ? Math.sqrt(value) : value;
            case TransformationType.SQUARE:
                return value * value;
            case TransformationType.NORMALIZE:
                if (param.min !== undefined && param.max !== undefined) {
                    return (value - param.min) / (param.max - param.min);
                }
                return value;
            case TransformationType.STANDARDIZE:
                // Dla standardizacji potrzebowalibyśmy znać średnią i odchylenie standardowe
                // Na razie zwracamy wartość nieprzerobioną
                return value;
            default:
                return value;
        }
    }
    /**
     * Sprawdza czy parametr jest aktywny (spełnia warunki)
     */
    isParameterActive(param, currentParameters) {
        if (!param.conditions || param.conditions.length === 0) {
            return true; // Brak warunków = zawsze aktywny
        }
        return param.conditions.every(condition => {
            const paramValue = currentParameters[condition.parameterName];
            if (paramValue === undefined) {
                return false; // Parametr nadrzędny nie został jeszcze wygenerowany
            }
            switch (condition.operator) {
                case '==':
                    return paramValue === condition.value;
                case '!=':
                    return paramValue !== condition.value;
                case '>':
                    return paramValue > condition.value;
                case '<':
                    return paramValue < condition.value;
                case '>=':
                    return paramValue >= condition.value;
                case '<=':
                    return paramValue <= condition.value;
                case 'in':
                    return condition.values?.includes(paramValue) || false;
                case 'not_in':
                    return !condition.values?.includes(paramValue) || true;
                default:
                    return false;
            }
        });
    }
    /**
     * Waliduje przestrzeń hiperparametrów
     */
    validateSpace(space) {
        if (!space.name || space.name.trim() === '') {
            throw new Error('Nazwa przestrzeni jest wymagana');
        }
        if (!space.parameters || space.parameters.length === 0) {
            throw new Error('Przestrzeń musi zawierać co najmniej jeden parametr');
        }
        // Sprawdź unikalność nazw parametrów
        const paramNames = space.parameters.map(p => p.name);
        const uniqueNames = new Set(paramNames);
        if (paramNames.length !== uniqueNames.size) {
            throw new Error('Nazwy parametrów muszą być unikalne');
        }
        // Waliduj każdy parametr
        for (const param of space.parameters) {
            this.validateParameter(param);
        }
        console.log(`✅ Walidacja przestrzeni ${space.name} zakończona pomyślnie`);
    }
    /**
     * Waliduje definicję parametru
     */
    validateParameter(param) {
        if (!param.name || param.name.trim() === '') {
            throw new Error('Nazwa parametru jest wymagana');
        }
        switch (param.type) {
            case ParameterType.INTEGER:
            case ParameterType.FLOAT:
                if (param.min === undefined || param.max === undefined) {
                    throw new Error(`Parametr ${param.name}: min i max są wymagane dla typu numerycznego`);
                }
                if (param.min >= param.max) {
                    throw new Error(`Parametr ${param.name}: min musi być mniejsze od max`);
                }
                break;
            case ParameterType.CATEGORICAL:
            case ParameterType.CHOICE:
                if (!param.choices || param.choices.length === 0) {
                    throw new Error(`Parametr ${param.name}: choices są wymagane dla typu kategorycznego`);
                }
                break;
        }
    }
    /**
     * Waliduje próbkę względem ograniczeń przestrzeni
     */
    validateSample(space, parameters) {
        const errors = [];
        // Sprawdź ograniczenia przestrzeni
        if (space.constraints) {
            for (const constraint of space.constraints) {
                try {
                    const isValid = this.evaluateConstraint(constraint, parameters);
                    if (!isValid) {
                        errors.push(`Naruszenie ograniczenia: ${constraint.name}`);
                    }
                }
                catch (error) {
                    errors.push(`Błąd walidacji ograniczenia ${constraint.name}: ${error}`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Ewaluuje ograniczenie przestrzeni
     */
    evaluateConstraint(constraint, parameters) {
        // Podstawowa implementacja - w przyszłości można rozszerzyć o parser wyrażeń matematycznych
        try {
            // Zastąp nazwy parametrów wartościami w wyrażeniu
            let expression = constraint.expression;
            for (const paramName of constraint.parameters) {
                const value = parameters[paramName];
                if (value !== undefined) {
                    // Jeśli wartość to string, dodaj cudzysłowy
                    const valueStr = typeof value === 'string' ? `"${value}"` : value.toString();
                    expression = expression.replace(new RegExp(`\\b${paramName}\\b`, 'g'), valueStr);
                }
            }
            // Ewaluuj wyrażenie (UWAGA: w produkcji lepiej użyć bezpiecznego parsera)
            return eval(expression);
        }
        catch (error) {
            console.warn(`Błąd ewaluacji ograniczenia ${constraint.name}:`, error);
            return true; // W przypadku błędu przyjmij że ograniczenie jest spełnione
        }
    }
    /**
     * Ładuje przestrzenie z dysku
     */
    loadSpaces() {
        if (!fs.existsSync(this.spacesDirectory)) {
            return;
        }
        const files = fs.readdirSync(this.spacesDirectory);
        let loadedCount = 0;
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(this.spacesDirectory, file);
                    const spaceData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.spaces.set(spaceData.name, spaceData);
                    loadedCount++;
                }
                catch (error) {
                    console.warn(`Błąd ładowania przestrzeni z ${file}:`, error);
                }
            }
        }
        if (loadedCount > 0) {
            console.log(`📂 Załadowano ${loadedCount} przestrzeni hiperparametrów`);
        }
    }
    /**
     * Zapisuje przestrzeń na dysk
     */
    saveSpace(space) {
        const fileName = `${space.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const filePath = path.join(this.spacesDirectory, fileName);
        fs.writeFileSync(filePath, JSON.stringify(space, null, 2));
    }
    /**
     * Zapisuje próbkę na dysk
     */
    saveSample(sample) {
        const fileName = `${sample.id}.json`;
        const filePath = path.join(this.samplesDirectory, fileName);
        fs.writeFileSync(filePath, JSON.stringify(sample, null, 2));
    }
    /**
     * Zwraca listę wszystkich przestrzeni
     */
    getAllSpaces() {
        return Array.from(this.spaces.values());
    }
    /**
     * Usuwa przestrzeń
     */
    deleteSpace(name) {
        if (!this.spaces.has(name)) {
            return false;
        }
        this.spaces.delete(name);
        // Usuń plik z dysku
        const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const filePath = path.join(this.spacesDirectory, fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.log(`🗑️ Usunięto przestrzeń: ${name}`);
        return true;
    }
    /**
     * Zwraca statystyki przestrzeni
     */
    getSpaceStatistics(name) {
        const space = this.getSpace(name);
        if (!space) {
            return null;
        }
        const stats = {
            name: space.name,
            parametersCount: space.parameters.length,
            parameterTypes: {},
            conditionalParameters: 0,
            constraintsCount: space.constraints?.length || 0,
            estimatedSpaceSize: 1
        };
        // Analiza typów parametrów
        for (const param of space.parameters) {
            stats.parameterTypes[param.type] = (stats.parameterTypes[param.type] || 0) + 1;
            if (param.conditions && param.conditions.length > 0) {
                stats.conditionalParameters++;
            }
            // Oszacuj rozmiar przestrzeni
            if (param.type === ParameterType.INTEGER && param.min !== undefined && param.max !== undefined) {
                const step = param.step || 1;
                stats.estimatedSpaceSize *= Math.floor((param.max - param.min) / step) + 1;
            }
            else if (param.type === ParameterType.CATEGORICAL && param.choices) {
                stats.estimatedSpaceSize *= param.choices.length;
            }
            else if (param.type === ParameterType.BOOLEAN) {
                stats.estimatedSpaceSize *= 2;
            }
        }
        return stats;
    }
}
exports.HyperparameterSpaceManager = HyperparameterSpaceManager;
// Export dla łatwego użycia
exports.hyperparameterSpaceManager = new HyperparameterSpaceManager();

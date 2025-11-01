"use strict";
/**
 * 🚀 [ENTERPRISE-MONITORING]
 * Simple Monitoring Integration Test
 *
 * Features:
 * - Basic Prometheus metrics
 * - Simple health monitoring
 * - Trading bot integration
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleMonitoringSystem = void 0;
var express_1 = __importDefault(require("express"));
var SimpleMonitoringSystem = /** @class */ (function () {
    function SimpleMonitoringSystem() {
        this.isRunning = false;
        this.metrics = new Map();
        this.port = 9090;
        this.app = (0, express_1.default)();
        this.setupRoutes();
        console.log('[SIMPLE MONITORING] System initialized');
    }
    SimpleMonitoringSystem.prototype.setupRoutes = function () {
        var _this = this;
        // Health endpoint
        this.app.get('/health', function (req, res) {
            res.json({
                status: 'healthy',
                timestamp: Date.now(),
                metrics: Object.fromEntries(_this.metrics)
            });
        });
        // Metrics endpoint (Prometheus format)
        this.app.get('/metrics', function (req, res) {
            var metricsText = '';
            for (var _i = 0, _a = Array.from(_this.metrics); _i < _a.length; _i++) {
                var _b = _a[_i], name_1 = _b[0], value = _b[1];
                metricsText += "# HELP ".concat(name_1, " Trading bot metric\n");
                metricsText += "# TYPE ".concat(name_1, " gauge\n");
                metricsText += "".concat(name_1, " ").concat(value, "\n");
            }
            res.set('Content-Type', 'text/plain');
            res.send(metricsText);
        });
    };
    SimpleMonitoringSystem.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.isRunning)
                    return [2 /*return*/];
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.app.listen(_this.port, function () {
                            _this.isRunning = true;
                            console.log("[SIMPLE MONITORING] Server started on port ".concat(_this.port));
                            console.log("[SIMPLE MONITORING] Metrics: http://localhost:".concat(_this.port, "/metrics"));
                            console.log("[SIMPLE MONITORING] Health: http://localhost:".concat(_this.port, "/health"));
                            resolve();
                        });
                    })];
            });
        });
    };
    SimpleMonitoringSystem.prototype.setMetric = function (name, value) {
        this.metrics.set(name, value);
    };
    SimpleMonitoringSystem.prototype.integrateWithBot = function (bot) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Simple integration - set basic metrics
                this.setMetric('trading_bot_status', 1);
                this.setMetric('trading_bot_uptime', process.uptime());
                this.setMetric('system_memory_usage', process.memoryUsage().heapUsed);
                console.log('[SIMPLE MONITORING] Bot integration completed');
                return [2 /*return*/];
            });
        });
    };
    SimpleMonitoringSystem.prototype.getStatus = function () {
        return {
            isInitialized: this.isRunning,
            systemStatus: {
                isRunning: this.isRunning,
                prometheus: {
                    isHealthy: this.isRunning,
                    activeAlerts: 0
                }
            },
            dashboards: [
                { id: 'simple', title: 'Simple Dashboard', panels: 1 }
            ],
            alerts: 0,
            activeAlerts: 0
        };
    };
    SimpleMonitoringSystem.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.isRunning = false;
                console.log('[SIMPLE MONITORING] System stopped');
                return [2 /*return*/];
            });
        });
    };
    return SimpleMonitoringSystem;
}());
exports.SimpleMonitoringSystem = SimpleMonitoringSystem;
exports.default = SimpleMonitoringSystem;

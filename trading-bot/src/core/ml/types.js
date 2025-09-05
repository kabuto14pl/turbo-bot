"use strict";
/**
 * 🧠 ADVANCED ML SYSTEM - TYPE DEFINITIONS
 * Replacing SimpleRL with enterprise-grade Deep RL system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_TIMEFRAMES = exports.MAX_SEQUENCE_LENGTH = exports.ACTION_DIMENSIONS = exports.FEATURE_DIMENSIONS = void 0;
// =================== EXPORTS ===================
// Constants
exports.FEATURE_DIMENSIONS = 500;
exports.ACTION_DIMENSIONS = 6; // position_size, confidence, hold_duration, stop_loss, take_profit, action_type
exports.MAX_SEQUENCE_LENGTH = 100;
exports.SUPPORTED_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

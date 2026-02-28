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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env.demo' });
(async () => {
    try {
        console.log('📋 Sprawdzanie dostępnych instrumentów na OKX Demo...');
        // Publiczne API - sprawdźmy jakie instrumenty są dostępne
        const response = await axios_1.default.get('https://eea.okx.com/api/v5/public/instruments', {
            params: {
                instType: 'SPOT' // Spot trading
            }
        });
        if (response.data.code === '0') {
            const instruments = response.data.data;
            console.log(`✅ Znaleziono ${instruments.length} instrumentów SPOT`);
            // Szukajmy BTC instrumentów
            const btcInstruments = instruments.filter((inst) => inst.instId.includes('BTC') &&
                (inst.instId.includes('USDT') || inst.instId.includes('USDC') || inst.instId.includes('USD')));
            console.log('\n💰 Dostępne BTC instrumenty:');
            btcInstruments.slice(0, 10).forEach((inst) => {
                console.log(`   ${inst.instId} - ${inst.state} (Min: ${inst.minSz})`);
            });
            // Sprawdźmy czy BTC-USDC jest dostępne
            const btcUsdc = instruments.find((inst) => inst.instId === 'BTC-USDC');
            if (btcUsdc) {
                console.log('\n🎯 BTC-USDC jest dostępne:');
                console.log(`   Status: ${btcUsdc.state}`);
                console.log(`   Min Size: ${btcUsdc.minSz}`);
                console.log(`   Max Size: ${btcUsdc.maxSz}`);
                console.log(`   Tick Size: ${btcUsdc.tickSz}`);
            }
            else {
                console.log('\n❌ BTC-USDC nie jest dostępne na Demo');
            }
        }
        else {
            console.log('❌ Błąd API:', response.data);
        }
    }
    catch (error) {
        console.log('❌ Błąd:', error.message);
    }
})();

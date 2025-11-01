/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
/**
 * 🔧 KOMPLETNA KONFIGURACJA OKX DEMO API
 * Bazuje na OKX Best Practices - pełna aktywacja i konfiguracja
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe z .env.demo
dotenv.config({ path: '.env.demo' });

const API_KEY = process.env.OKX_API_KEY!;
const SECRET_KEY = process.env.OKX_SECRET_KEY!;
const PASSPHRASE = process.env.OKX_PASSPHRASE!;
const BASE_URL = 'https://www.okx.com';

/**
 * Utworzenie podpisu OKX
 */
function createOKXSignature(method: string, requestPath: string, body: string, timestamp: string): string {
  const message = timestamp + method.toUpperCase() + requestPath + body;
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
}

/**
 * 1. TEST PUBLICZNYCH ENDPOINTÓW
 */
async function testPublicEndpoints() {
  console.log('🌐 =================================');
  console.log('   TEST PUBLICZNYCH ENDPOINTÓW');
  console.log('🌐 =================================');

  try {
    // Test czasu serwera
    const timeResponse = await axios.get(`${BASE_URL}/api/v5/public/time`);
    console.log('✅ Server Time:', {
      success: timeResponse.data.code === '0',
      serverTime: new Date(parseInt(timeResponse.data.data[0].ts)).toISOString(),
    });

    // Test instrumentów
    const instrumentsResponse = await axios.get(`${BASE_URL}/api/v5/public/instruments`, {
      params: { instType: 'SPOT' }
    });
    console.log('✅ Instruments:', {
      success: instrumentsResponse.data.code === '0',
      count: instrumentsResponse.data.data?.length || 0,
    });

    // Test market ticker
    const tickerResponse = await axios.get(`${BASE_URL}/api/v5/market/ticker`, {
      params: { instId: 'BTC-USDT' }
    });
    console.log('✅ Market Ticker:', {
      success: tickerResponse.data.code === '0',
      btcPrice: tickerResponse.data.data?.[0]?.last,
    });

    return true;

  } catch (error: any) {
    console.error('❌ Public endpoints failed:', error.message);
    return false;
  }
}

/**
 * 2. TEST UWIERZYTELNIENIA - MULTIPLE APPROACHES
 */
async function testAuthentication() {
  console.log('\n🔐 =================================');
  console.log('   TEST UWIERZYTELNIENIA');
  console.log('🔐 =================================');

  const testCases = [
    {
      name: 'Account Config (Basic Auth)',
      method: 'GET',
      path: '/api/v5/account/config',
      body: '',
    },
    {
      name: 'Account Balance (Full Auth)',
      method: 'GET', 
      path: '/api/v5/account/balance',
      body: '',
    },
    {
      name: 'Max Withdrawal (Permission Test)',
      method: 'GET',
      path: '/api/v5/account/max-withdrawal',
      body: '',
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`\n🎯 Testing: ${testCase.name}`);

      const timestamp = new Date().toISOString();
      const signature = createOKXSignature(testCase.method, testCase.path, testCase.body, timestamp);

      // Test ze standardowymi nagłówkami (bez demo)
      try {
        const standardResponse = await axios({
          method: testCase.method.toLowerCase() as any,
          url: `${BASE_URL}${testCase.path}`,
          data: testCase.body || undefined,
          headers: {
            'OK-ACCESS-KEY': API_KEY,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': PASSPHRASE,
            'Content-Type': 'application/json',
          },
        });

        console.log(`   🟢 Standard Headers: SUCCESS (${standardResponse.data.code})`);
        results.push({ test: testCase.name, standard: true, demo: null });

      } catch (standardError: any) {
        console.log(`   🔴 Standard Headers: FAILED (${standardError.response?.data?.code || 'ERROR'})`);

        // Test z nagłówkiem demo
        try {
          const demoTimestamp = new Date().toISOString();
          const demoSignature = createOKXSignature(testCase.method, testCase.path, testCase.body, demoTimestamp);

          const demoResponse = await axios({
            method: testCase.method.toLowerCase() as any,
            url: `${BASE_URL}${testCase.path}`,
            data: testCase.body || undefined,
            headers: {
              'OK-ACCESS-KEY': API_KEY,
              'OK-ACCESS-SIGN': demoSignature,
              'OK-ACCESS-TIMESTAMP': demoTimestamp,
              'OK-ACCESS-PASSPHRASE': PASSPHRASE,
              'Content-Type': 'application/json',
              'x-simulated-trading': '1', // Demo header
            },
          });

          console.log(`   🟡 Demo Headers: SUCCESS (${demoResponse.data.code})`);
          results.push({ test: testCase.name, standard: false, demo: true });

        } catch (demoError: any) {
          console.log(`   🔴 Demo Headers: FAILED (${demoError.response?.data?.code || 'ERROR'})`);
          console.log(`       Error: ${demoError.response?.data?.msg || demoError.message}`);
          results.push({ test: testCase.name, standard: false, demo: false });
        }
      }

    } catch (error: any) {
      console.error(`   💥 ${testCase.name} crashed:`, error.message);
      results.push({ test: testCase.name, standard: false, demo: false });
    }
  }

  return results;
}

/**
 * 3. SPRAWDZENIE KONFIGURACJI KONTA
 */
async function checkAccountConfiguration() {
  console.log('\n⚙️  =================================');
  console.log('   SPRAWDZENIE KONFIGURACJI KONTA');
  console.log('⚙️  =================================');

  try {
    const timestamp = new Date().toISOString();
    const signature = createOKXSignature('GET', '/api/v5/account/config', '', timestamp);

    const response = await axios.get(`${BASE_URL}/api/v5/account/config`, {
      headers: {
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': PASSPHRASE,
        'x-simulated-trading': '1',
      },
    });

    if (response.data.code === '0' && response.data.data?.[0]) {
      const config = response.data.data[0];
      
      console.log('✅ Account Configuration Retrieved:');
      console.log(`   Account Level: ${config.acctLv} (${getAccountLevelName(config.acctLv)})`);
      console.log(`   Position Mode: ${config.posMode}`);
      console.log(`   Auto Loan: ${config.autoLoan}`);
      console.log(`   Permissions: ${config.perm}`);
      console.log(`   Account Type: ${config.type}`);
      console.log(`   KYC Level: ${config.kycLv}`);
      console.log(`   IP Restrictions: ${config.ip || 'None'}`);

      return config;
    } else {
      console.log('❌ Failed to get account config');
      return null;
    }

  } catch (error: any) {
    console.log('❌ Account config error:', error.response?.data?.msg || error.message);
    return null;
  }
}

/**
 * Helper function to get account level name
 */
function getAccountLevelName(level: string): string {
  const levels: Record<string, string> = {
    '1': 'Spot mode',
    '2': 'Futures mode', 
    '3': 'Multi-currency margin',
    '4': 'Portfolio margin',
  };
  return levels[level] || 'Unknown';
}

/**
 * 4. TEST INSTRUMENTÓW I MARKET DATA
 */
async function testInstrumentsAndMarketData() {
  console.log('\n📊 =================================');
  console.log('   TEST INSTRUMENTÓW I MARKET DATA');
  console.log('📊 =================================');

  try {
    // Test dostępnych instrumentów dla aktualnego konta
    const instrumentsResponse = await axios.get(`${BASE_URL}/api/v5/public/instruments`, {
      params: { instType: 'SPOT' }
    });

    if (instrumentsResponse.data.code === '0') {
      const instruments = instrumentsResponse.data.data;
      console.log(`✅ Available SPOT instruments: ${instruments.length}`);
      
      // Pokaż pierwsze 5 instrumentów
      console.log('   Sample instruments:');
      instruments.slice(0, 5).forEach((inst: any) => {
        console.log(`     ${inst.instId} (${inst.baseCcy}/${inst.quoteCcy})`);
      });

      // Test market data dla BTC-USDT
      const tickerResponse = await axios.get(`${BASE_URL}/api/v5/market/ticker`, {
        params: { instId: 'BTC-USDT' }
      });

      if (tickerResponse.data.code === '0') {
        const ticker = tickerResponse.data.data[0];
        console.log(`✅ BTC-USDT Market Data:`, {
          price: ticker.last,
          volume: ticker.vol24h,
          change: ticker.chg24h,
        });
      }

      return true;
    }

    return false;

  } catch (error: any) {
    console.error('❌ Instruments/Market data failed:', error.message);
    return false;
  }
}

/**
 * 5. DIAGNOZA PROBLEMÓW I REKOMENDACJE
 */
function diagnoseAndRecommend(authResults: any[], accountConfig: any) {
  console.log('\n🔍 =================================');
  console.log('   DIAGNOZA I REKOMENDACJE');
  console.log('🔍 =================================');

  const allStandardFailed = authResults.every(r => !r.standard);
  const allDemoFailed = authResults.every(r => !r.demo);
  const hasSuccessfulAuth = authResults.some(r => r.standard || r.demo);

  console.log('\n📋 DIAGNOZA:');
  
  if (hasSuccessfulAuth) {
    console.log('✅ SUKCES: OKX API działa poprawnie!');
    
    if (accountConfig) {
      console.log('✅ Konfiguracja konta została odczytana');
      
      if (authResults.some(r => r.demo)) {
        console.log('✅ Demo Trading API jest aktywne');
      }
      
      if (authResults.some(r => r.standard)) {
        console.log('⚠️  Uwaga: API działa bez nagłówka demo - sprawdź czy to production!');
      }
    }
  } else {
    console.log('❌ PROBLEM: Brak dostępu do OKX API');
    
    if (allStandardFailed && allDemoFailed) {
      console.log('\n🔧 MOŻLIWE PRZYCZYNY:');
      console.log('1. 🔑 Klucze API nie są poprawnie utworzone lub aktywowane');
      console.log('2. 🌐 Ograniczenia IP - sprawdź ustawienia IP w panelu API');
      console.log('3. 🕒 Problem z synchronizacją czasu systemowego');
      console.log('4. 🎯 Klucze utworzone dla Production zamiast Demo Trading');
      console.log('5. 🔒 Brak wymaganych uprawnień (Read, Trade)');
    }
  }

  console.log('\n🛠️  NASTĘPNE KROKI:');
  
  if (!hasSuccessfulAuth) {
    console.log('📝 KROKI NAPRAWCZE:');
    console.log('1. Zaloguj się do my.okx.com');
    console.log('2. Przejdź do: Trade → Demo Trading');
    console.log('3. Aktywuj Demo Trading Account jeśli nie jest aktywny');
    console.log('4. Przejdź do: Personal Center → Demo Trading API');
    console.log('5. Utwórz nowy Demo Trading API Key z uprawnieniami:');
    console.log('   - ✓ Read');
    console.log('   - ✓ Trade');
    console.log('6. Dodaj swoje IP do dozwolonych adresów (opcjonalne)');
    console.log('7. Skopiuj nowe klucze do .env.demo');
    console.log('8. Uruchom ponownie test');
  } else {
    console.log('🚀 MOŻESZ URUCHOMIĆ TRADING BOT!');
    console.log('1. Sprawdź konfigurację strategii');
    console.log('2. Ustaw odpowiednie limity ryzyka');
    console.log('3. Uruchom bot w trybie demo');
  }
}

/**
 * GŁÓWNA FUNKCJA DIAGNOSTYCZNA
 */
async function main() {
  console.log('🔧 ================================================');
  console.log('   OKX DEMO API - KOMPLETNA KONFIGURACJA');
  console.log('   Bazuje na OKX Best Practices Guide');
  console.log('🔧 ================================================\n');

  console.log('🔑 API Credentials Check:');
  console.log(`   API Key: ${API_KEY?.slice(0, 8)}...${API_KEY?.slice(-4)} (${API_KEY?.length} chars)`);
  console.log(`   Secret: ****** (${SECRET_KEY?.length} chars)`);
  console.log(`   Passphrase: ****** (${PASSPHRASE?.length} chars)\n`);

  // 1. Test publicznych endpointów
  const publicSuccess = await testPublicEndpoints();
  
  if (!publicSuccess) {
    console.log('\n💥 KRITYCZNY BŁĄD: Publiczne API OKX nie działa!');
    console.log('   Sprawdź połączenie internetowe lub status OKX');
    return;
  }

  // 2. Test uwierzytelnienia
  const authResults = await testAuthentication();

  // 3. Sprawdzenie konfiguracji konta (jeśli auth działa)
  let accountConfig = null;
  if (authResults.some(r => r.standard || r.demo)) {
    accountConfig = await checkAccountConfiguration();
  }

  // 4. Test instrumentów i market data
  await testInstrumentsAndMarketData();

  // 5. Diagnoza i rekomendacje
  diagnoseAndRecommend(authResults, accountConfig);

  console.log('\n🏁 ================================================');
  console.log('   DIAGNOSTYKA ZAKOŃCZONA');
  console.log('🏁 ================================================');
}

// Uruchom pełną diagnostykę
main().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  console.log('\n🆘 W przypadku dalszych problemów:');
  console.log('1. Sprawdź status OKX API: https://www.okx.com/status');
  console.log('2. Skontaktuj się z supportem OKX');
  console.log('3. Sprawdź czy konto nie jest zablokowane');
});

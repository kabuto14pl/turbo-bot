/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.demo' });

(async () => {
  try {
    console.log('📋 Sprawdzanie dostępnych instrumentów na OKX Demo...');
    
    // Publiczne API - sprawdźmy jakie instrumenty są dostępne
    const response = await axios.get('https://eea.okx.com/api/v5/public/instruments', {
      params: {
        instType: 'SPOT'  // Spot trading
      }
    });
    
    if (response.data.code === '0') {
      const instruments = response.data.data;
      console.log(`✅ Znaleziono ${instruments.length} instrumentów SPOT`);
      
      // Szukajmy BTC instrumentów
      const btcInstruments = instruments.filter((inst: any) => 
        inst.instId.includes('BTC') && 
        (inst.instId.includes('USDT') || inst.instId.includes('USDC') || inst.instId.includes('USD'))
      );
      
      console.log('\n💰 Dostępne BTC instrumenty:');
      btcInstruments.slice(0, 10).forEach((inst: any) => {
        console.log(`   ${inst.instId} - ${inst.state} (Min: ${inst.minSz})`);
      });
      
      // Sprawdźmy czy BTC-USDC jest dostępne
      const btcUsdc = instruments.find((inst: any) => inst.instId === 'BTC-USDC');
      if (btcUsdc) {
        console.log('\n🎯 BTC-USDC jest dostępne:');
        console.log(`   Status: ${btcUsdc.state}`);
        console.log(`   Min Size: ${btcUsdc.minSz}`);
        console.log(`   Max Size: ${btcUsdc.maxSz}`);
        console.log(`   Tick Size: ${btcUsdc.tickSz}`);
      } else {
        console.log('\n❌ BTC-USDC nie jest dostępne na Demo');
      }
      
    } else {
      console.log('❌ Błąd API:', response.data);
    }
    
  } catch (error: any) {
    console.log('❌ Błąd:', error.message);
  }
})();

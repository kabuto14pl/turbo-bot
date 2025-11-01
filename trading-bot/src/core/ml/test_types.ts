/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * � [TESTING-FRAMEWORK]
 * ML TEST TYPES - Simplified types for ML testing without TensorFlow
 * 
 * Testing framework providing lightweight ML types for component testing
 * Eliminates heavy dependencies during test compilation
 */

export interface SimpleDeepRLAction {
  position_size: number;
  confidence: number;
  action_type: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
}

export interface SimpleMarketState {
  timestamp: number;
  price: number;
  volume: number;
  rsi: number;
}

export interface SimpleExperience {
  state: Float32Array;
  action: SimpleDeepRLAction;
  reward: number;
  next_state: Float32Array;
  done: boolean;
  timestamp: number;
}

export const FEATURE_DIMENSIONS = 500;
export const ACTION_DIMENSIONS = 6;

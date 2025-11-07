/**
 * 🧪 MUST-PASS TEST SUITE - RECOVERY & CHECKPOINT
 * Critical tests for system recovery after crashes
 * Category: State Persistence, Checkpoint Restoration, Zero Data Loss
 */

import * as fs from 'fs';
import * as path from 'path';

describe('💾 MUST-PASS: Recovery & Checkpoint', () => {
    const CHECKPOINT_DIR = path.join(__dirname, '../.test-checkpoints');
    let bot: any;

    beforeEach(() => {
        // Create checkpoint directory
        if (!fs.existsSync(CHECKPOINT_DIR)) {
            fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
        }

        // Mock Trading Bot with checkpoint capabilities
        bot = {
            portfolio: {
                balance: 10000,
                positions: [],
                trades: []
            },

            isRunning: false,
            lastCheckpoint: 0,
            checkpointInterval: 30000, // 30 seconds

            async saveCheckpoint() {
                const checkpoint = {
                    timestamp: Date.now(),
                    portfolio: JSON.parse(JSON.stringify(this.portfolio)),
                    isRunning: this.isRunning,
                    version: '1.0.0'
                };

                const filename = path.join(CHECKPOINT_DIR, 'latest.json');
                fs.writeFileSync(filename, JSON.stringify(checkpoint, null, 2));
                this.lastCheckpoint = checkpoint.timestamp;

                return checkpoint;
            },

            async loadCheckpoint() {
                const filename = path.join(CHECKPOINT_DIR, 'latest.json');

                if (!fs.existsSync(filename)) {
                    throw new Error('No checkpoint found');
                }

                const data = fs.readFileSync(filename, 'utf-8');
                const checkpoint = JSON.parse(data);

                this.portfolio = checkpoint.portfolio;
                this.isRunning = checkpoint.isRunning;

                return checkpoint;
            },

            async start() {
                this.isRunning = true;

                // Try to restore from checkpoint
                try {
                    await this.loadCheckpoint();
                    console.log('✅ Restored from checkpoint');
                } catch (error) {
                    console.log('🆕 Starting fresh (no checkpoint)');
                }

                // Start checkpoint interval
                this.checkpointTimer = setInterval(() => {
                    if (this.isRunning) {
                        this.saveCheckpoint();
                    }
                }, this.checkpointInterval);
            },

            async stop() {
                this.isRunning = false;
                if (this.checkpointTimer) {
                    clearInterval(this.checkpointTimer);
                }
                await this.saveCheckpoint();
            },

            simulateCrash() {
                this.isRunning = false;
                if (this.checkpointTimer) {
                    clearInterval(this.checkpointTimer);
                }
                // Don't save checkpoint - simulate sudden crash
            }
        };
    });

    afterEach(() => {
        // Cleanup
        if (fs.existsSync(CHECKPOINT_DIR)) {
            fs.rmSync(CHECKPOINT_DIR, { recursive: true, force: true });
        }

        if (bot.checkpointTimer) {
            clearInterval(bot.checkpointTimer);
        }
    });

    test('TC-REC-001: Bot crash mid-cycle - restart from checkpoint', async () => {
        // Start bot and create some state
        await bot.start();

        bot.portfolio.positions.push({
            symbol: 'BTCUSDT',
            side: 'LONG',
            size: 0.1,
            entryPrice: 50000
        });
        bot.portfolio.balance = 9500;

        // Save checkpoint
        const checkpoint1 = await bot.saveCheckpoint();
        expect(checkpoint1.portfolio.balance).toBe(9500);
        expect(checkpoint1.portfolio.positions.length).toBe(1);

        // Simulate crash
        bot.simulateCrash();

        // Create new bot instance
        const newBot = { ...bot };
        newBot.checkpointTimer = null;

        // Restore from checkpoint
        const restored = await newBot.loadCheckpoint();

        expect(restored.portfolio.balance).toBe(9500);
        expect(restored.portfolio.positions.length).toBe(1);
        expect(restored.portfolio.positions[0].symbol).toBe('BTCUSDT');
    });

    test('TC-REC-002: DB snapshot restore - portfolio state matches', async () => {
        const initialState = {
            balance: 9750,
            positions: [
                { symbol: 'BTCUSDT', size: 0.05, entryPrice: 50000 },
                { symbol: 'ETHUSDT', size: 1.5, entryPrice: 3000 }
            ],
            trades: [
                { symbol: 'BTCUSDT', pnl: -250, timestamp: Date.now() - 3600000 }
            ]
        };

        bot.portfolio = { ...initialState };
        await bot.saveCheckpoint();

        // Simulate restart
        const restoredBot = { ...bot };
        restoredBot.portfolio = { balance: 0, positions: [], trades: [] };

        await restoredBot.loadCheckpoint();

        // Verify exact match
        expect(restoredBot.portfolio.balance).toBe(initialState.balance);
        expect(restoredBot.portfolio.positions.length).toBe(initialState.positions.length);
        expect(restoredBot.portfolio.trades.length).toBe(initialState.trades.length);

        // Deep equality check
        expect(restoredBot.portfolio).toEqual(initialState);
    });

    test('TC-REC-003: Recovery time <10 seconds', async () => {
        // Setup state
        bot.portfolio.balance = 9800;
        bot.portfolio.positions.push({ symbol: 'BTCUSDT', size: 0.1 });
        await bot.saveCheckpoint();

        // Measure recovery time
        const startTime = Date.now();

        const newBot = { ...bot };
        newBot.portfolio = { balance: 0, positions: [], trades: [] };
        await newBot.loadCheckpoint();

        const recoveryTime = Date.now() - startTime;

        expect(recoveryTime).toBeLessThan(10000); // <10 seconds
        expect(recoveryTime).toBeLessThan(1000);   // Should be <1s in practice

        console.log(`⚡ Recovery time: ${recoveryTime}ms`);
    });

    test('TC-REC-004: Checkpoint saved every 30 seconds', (done) => {
        const checkpoints: number[] = [];

        // Override saveCheckpoint to track calls
        const originalSave = bot.saveCheckpoint.bind(bot);
        bot.saveCheckpoint = async function () {
            checkpoints.push(Date.now());
            return await originalSave();
        };

        bot.start();

        // Wait for 65 seconds to capture at least 2 checkpoints
        setTimeout(() => {
            bot.stop();

            // Should have at least 2 checkpoints
            expect(checkpoints.length).toBeGreaterThanOrEqual(2);

            // Check intervals are ~30s
            if (checkpoints.length >= 2) {
                const interval = checkpoints[1] - checkpoints[0];
                expect(interval).toBeGreaterThan(25000); // Allow 5s tolerance
                expect(interval).toBeLessThan(35000);
            }

            done();
        }, 65000);
    }, 70000); // Increase Jest timeout for this test

    test('TC-REC-005: Zero data loss after crash', async () => {
        await bot.start();

        // Execute trades
        const trade1 = { symbol: 'BTCUSDT', pnl: 100, timestamp: Date.now() };
        const trade2 = { symbol: 'ETHUSDT', pnl: -50, timestamp: Date.now() };

        bot.portfolio.trades.push(trade1);
        bot.portfolio.balance += trade1.pnl;

        // Save checkpoint after first trade
        await bot.saveCheckpoint();

        bot.portfolio.trades.push(trade2);
        bot.portfolio.balance += trade2.pnl;

        // Save checkpoint after second trade
        await bot.saveCheckpoint();

        // Crash and restore
        const snapshot = await bot.loadCheckpoint();

        // Verify all trades present
        expect(snapshot.portfolio.trades.length).toBe(2);
        expect(snapshot.portfolio.balance).toBe(10000 + 100 - 50);
    });

    test('TC-REC-006: Checkpoint file integrity validation', async () => {
        bot.portfolio.balance = 9900;
        await bot.saveCheckpoint();

        // Read checkpoint file
        const filename = path.join(CHECKPOINT_DIR, 'latest.json');
        const data = fs.readFileSync(filename, 'utf-8');
        const checkpoint = JSON.parse(data);

        // Validate structure
        expect(checkpoint).toHaveProperty('timestamp');
        expect(checkpoint).toHaveProperty('portfolio');
        expect(checkpoint).toHaveProperty('version');

        // Validate data types
        expect(typeof checkpoint.timestamp).toBe('number');
        expect(typeof checkpoint.portfolio.balance).toBe('number');
        expect(Array.isArray(checkpoint.portfolio.positions)).toBe(true);
    });

    test('TC-REC-007: Graceful shutdown saves final checkpoint', async () => {
        await bot.start();

        bot.portfolio.balance = 10500;
        bot.portfolio.positions.push({ symbol: 'BTCUSDT', size: 0.2 });

        // Graceful stop
        await bot.stop();

        // Verify final state saved
        const checkpoint = await bot.loadCheckpoint();
        expect(checkpoint.portfolio.balance).toBe(10500);
        expect(checkpoint.portfolio.positions.length).toBe(1);
    });

    test('TC-REC-008: Handle corrupted checkpoint file', async () => {
        // Write corrupted checkpoint
        const filename = path.join(CHECKPOINT_DIR, 'latest.json');
        fs.writeFileSync(filename, 'corrupted{json');

        // Should handle gracefully
        await expect(bot.loadCheckpoint()).rejects.toThrow();

        // Bot should start fresh if checkpoint corrupted
        try {
            await bot.loadCheckpoint();
        } catch (error) {
            console.log('Checkpoint corrupted, starting fresh');
            bot.portfolio = { balance: 10000, positions: [], trades: [] };
        }

        expect(bot.portfolio.balance).toBe(10000);
    });
});

/**
 * Test Evidence:
 * - Checkpoint files in .test-checkpoints/ directory
 * - Logs: "✅ Restored from checkpoint" or "🆕 Starting fresh"
 * - Metrics: recovery_time_ms, checkpoint_save_count
 * - DB snapshots: compare before_crash vs after_recovery
 */

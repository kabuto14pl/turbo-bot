/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Logger } from '../../infrastructure/logging/logger';

interface TradingSession {
    name: string;
    startHour: number;  // 0-23
    endHour: number;    // 0-23
    timeZone: string;   // np. 'Asia/Tokyo'
    isActive: boolean;
    volatilityProfile: {
        typical: number;
        high: number;
        low: number;
    };
}

interface SessionConfig {
    checkInterval: number;  // Jak często sprawdzać zmianę sesji
    sessions: {
        [key: string]: Partial<TradingSession>;
    };
}

export class SessionManager {
    private readonly config: SessionConfig;
    private readonly logger: Logger;
    private currentSession: TradingSession | null = null;
    private lastCheck: number = 0;

    // Predefiniowane sesje
    private readonly defaultSessions: { [key: string]: TradingSession } = {
        ASIA: {
            name: 'Asian Session',
            startHour: 0,    // 00:00 UTC
            endHour: 8,      // 08:00 UTC
            timeZone: 'Asia/Tokyo',
            isActive: true,
            volatilityProfile: {
                typical: 0.8,  // 80% normalnej zmienności
                high: 1.2,
                low: 0.6
            }
        },
        LONDON: {
            name: 'London Session',
            startHour: 8,    // 08:00 UTC
            endHour: 16,     // 16:00 UTC
            timeZone: 'Europe/London',
            isActive: true,
            volatilityProfile: {
                typical: 1.0,  // Normalna zmienność
                high: 1.5,
                low: 0.8
            }
        },
        NY: {
            name: 'New York Session',
            startHour: 13,   // 13:00 UTC
            endHour: 21,     // 21:00 UTC
            timeZone: 'America/New_York',
            isActive: true,
            volatilityProfile: {
                typical: 1.2,  // 120% normalnej zmienności
                high: 1.8,
                low: 0.9
            }
        }
    };

    constructor(
        config: Partial<SessionConfig> = {},
        logger: Logger
    ) {
        this.logger = logger;
        this.config = {
            checkInterval: 5 * 60 * 1000,  // 5 min
            sessions: {},
            ...config
        };

        // Połącz domyślne sesje z konfiguracją użytkownika
        for (const [key, session] of Object.entries(this.defaultSessions)) {
            this.config.sessions[key] = {
                ...session,
                ...this.config.sessions[key]
            };
        }
    }

    getCurrentSession(timestamp: number = Date.now()): TradingSession | null {
        // Sprawdź czy potrzebna aktualizacja
        if (timestamp - this.lastCheck > this.config.checkInterval) {
            this.updateCurrentSession(timestamp);
        }

        return this.currentSession;
    }

    getSessionVolatilityMultiplier(timestamp: number = Date.now()): number {
        const session = this.getCurrentSession(timestamp);
        if (!session) return 1.0;

        return session.volatilityProfile.typical;
    }

    isActiveSession(
        timestamp: number = Date.now(),
        sessionName?: string
    ): boolean {
        if (sessionName) {
            const session = this.config.sessions[sessionName];
            return session ? this.isSessionActive(session, timestamp) : false;
        }

        // Sprawdź czy jakakolwiek sesja jest aktywna
        return Object.values(this.config.sessions).some(session =>
            session.isActive && this.isSessionActive(session, timestamp)
        );
    }

    getNextSessionChange(timestamp: number = Date.now()): {
        timestamp: number;
        type: 'START' | 'END';
        session: string;
    } | null {
        let nextChange: {
            timestamp: number;
            type: 'START' | 'END';
            session: string;
        } | null = null;
        let minDelta = Infinity;

        for (const [name, session] of Object.entries(this.config.sessions)) {
            if (!session.isActive) continue;

            const { start, end } = this.getSessionTimes(session, timestamp);
            const now = this.getHourUTC(timestamp);

            // Sprawdź następny start
            let startDelta = start - now;
            if (startDelta <= 0) startDelta += 24;
            if (startDelta < minDelta) {
                minDelta = startDelta;
                nextChange = {
                    timestamp: timestamp + startDelta * 60 * 60 * 1000,
                    type: 'START',
                    session: name
                };
            }

            // Sprawdź następny koniec
            let endDelta = end - now;
            if (endDelta <= 0) endDelta += 24;
            if (endDelta < minDelta) {
                minDelta = endDelta;
                nextChange = {
                    timestamp: timestamp + endDelta * 60 * 60 * 1000,
                    type: 'END',
                    session: name
                };
            }
        }

        return nextChange;
    }

    private updateCurrentSession(timestamp: number): void {
        let activeSession: TradingSession | null = null;
        let maxVolatility = 0;

        // Znajdź aktywną sesję z najwyższą zmiennością
        for (const session of Object.values(this.config.sessions)) {
            if (session.isActive && this.isSessionActive(session, timestamp)) {
                const volatilityProfile = session.volatilityProfile;
                if (volatilityProfile && volatilityProfile.typical > maxVolatility) {
                    maxVolatility = volatilityProfile.typical;
                    activeSession = session as TradingSession;
                }
            }
        }

        if (this.currentSession?.name !== activeSession?.name) {
            this.logger.info('[SessionManager] Zmiana sesji', {
                from: this.currentSession?.name,
                to: activeSession?.name,
                timestamp: new Date(timestamp).toISOString()
            });
        }

        this.currentSession = activeSession;
        this.lastCheck = timestamp;
    }

    private isSessionActive(session: Partial<TradingSession>, timestamp: number): boolean {
        if (!session.startHour || !session.endHour) return false;

        const hour = this.getHourUTC(timestamp);
        
        if (session.startHour < session.endHour) {
            // Normalna sesja w ramach jednego dnia
            return hour >= session.startHour && hour < session.endHour;
        } else {
            // Sesja przechodząca przez północ
            return hour >= session.startHour || hour < session.endHour;
        }
    }

    private getSessionTimes(
        session: Partial<TradingSession>,
        timestamp: number
    ): { start: number; end: number } {
        return {
            start: session.startHour || 0,
            end: session.endHour || 0
        };
    }

    private getHourUTC(timestamp: number): number {
        return new Date(timestamp).getUTCHours();
    }
} 
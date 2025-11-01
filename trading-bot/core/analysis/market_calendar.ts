/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Logger } from '../../infrastructure/logging/logger';

interface EconomicEvent {
    timestamp: number;
    type: 'HIGH' | 'MEDIUM' | 'LOW';
    name: string;
    description: string;
    impact: string[];  // Lista par walutowych, na które wpływa
    blackoutBefore: number;  // Czas przed wydarzeniem (ms)
    blackoutAfter: number;   // Czas po wydarzeniu (ms)
}

interface CalendarConfig {
    updateInterval: number;  // Jak często aktualizować kalendarz
    dataSource: string;     // URL źródła danych
    defaultBlackout: {
        before: number;     // Domyślny czas przed (ms)
        after: number;      // Domyślny czas po (ms)
    };
}

export class MarketCalendar {
    private readonly config: CalendarConfig;
    private readonly logger: Logger;
    private events: EconomicEvent[] = [];
    private lastUpdate: number = 0;

    constructor(
        config: Partial<CalendarConfig> = {},
        logger: Logger
    ) {
        this.logger = logger;
        this.config = {
            updateInterval: 60 * 60 * 1000, // 1h
            dataSource: 'https://api.example.com/calendar',
            defaultBlackout: {
                before: 15 * 60 * 1000,  // 15 min
                after: 15 * 60 * 1000    // 15 min
            },
            ...config
        };
    }

    async initialize(): Promise<void> {
        await this.updateCalendar();
    }

    async getNextEvent(
        timestamp: number = Date.now(),
        symbols: string[] = []
    ): Promise<EconomicEvent | null> {
        // Sprawdź czy potrzebna aktualizacja
        if (timestamp - this.lastUpdate > this.config.updateInterval) {
            await this.updateCalendar();
        }

        // Znajdź następne wydarzenie
        return this.events.find(event => 
            event.timestamp > timestamp &&
            (symbols.length === 0 || event.impact.some(s => symbols.includes(s)))
        ) || null;
    }

    isBlackoutPeriod(
        timestamp: number = Date.now(),
        symbols: string[] = []
    ): boolean {
        // Znajdź wszystkie wydarzenia w okolicy timestampu
        const relevantEvents = this.events.filter(event => {
            const eventStart = event.timestamp - event.blackoutBefore;
            const eventEnd = event.timestamp + event.blackoutAfter;
            return timestamp >= eventStart && timestamp <= eventEnd &&
                   (symbols.length === 0 || event.impact.some(s => symbols.includes(s)));
        });

        return relevantEvents.length > 0;
    }

    private async updateCalendar(): Promise<void> {
        try {
            // Pobierz nowe wydarzenia
            const response = await fetch(this.config.dataSource);
            const data = await response.json();

            // Przetwórz i zapisz wydarzenia
            this.events = this.processEvents(Array.isArray(data) ? data : []);
            this.lastUpdate = Date.now();

            this.logger.info('[Calendar] Kalendarz zaktualizowany', {
                eventsCount: this.events.length,
                nextEvent: this.events[0]
            });
        } catch (error) {
            this.logger.error('[Calendar] Błąd aktualizacji kalendarza', error);
        }
    }

    private processEvents(data: any[]): EconomicEvent[] {
        return data.map(event => ({
            timestamp: new Date(event.date).getTime(),
            type: this.getEventType(event.importance),
            name: event.name,
            description: event.description,
            impact: this.getEventImpact(event),
            blackoutBefore: event.blackoutBefore || this.config.defaultBlackout.before,
            blackoutAfter: event.blackoutAfter || this.config.defaultBlackout.after
        }));
    }

    private getEventType(importance: string): 'HIGH' | 'MEDIUM' | 'LOW' {
        switch (importance.toLowerCase()) {
            case 'high':
            case 'critical':
                return 'HIGH';
            case 'medium':
            case 'moderate':
                return 'MEDIUM';
            default:
                return 'LOW';
        }
    }

    private getEventImpact(event: any): string[] {
        // Przykładowa logika określania wpływu wydarzenia
        const impact: string[] = [];

        // Wydarzenia FED wpływają na USD
        if (event.name.includes('FED') || event.name.includes('FOMC')) {
            impact.push('BTCUSD', 'ETHUSD');
        }

        // Wydarzenia ECB wpływają na EUR
        if (event.name.includes('ECB') || event.name.includes('European')) {
            impact.push('BTCEUR', 'ETHEUR');
        }

        // Globalne wydarzenia wpływają na wszystkie pary
        if (event.type === 'HIGH' && event.global) {
            impact.push('BTCUSD', 'BTCEUR', 'ETHUSD', 'ETHEUR');
        }

        return impact;
    }
} 
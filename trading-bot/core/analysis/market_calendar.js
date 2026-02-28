"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketCalendar = void 0;
class MarketCalendar {
    constructor(config = {}, logger) {
        this.events = [];
        this.lastUpdate = 0;
        this.logger = logger;
        this.config = {
            updateInterval: 60 * 60 * 1000, // 1h
            dataSource: 'https://api.example.com/calendar',
            defaultBlackout: {
                before: 15 * 60 * 1000, // 15 min
                after: 15 * 60 * 1000 // 15 min
            },
            ...config
        };
    }
    async initialize() {
        await this.updateCalendar();
    }
    async getNextEvent(timestamp = Date.now(), symbols = []) {
        // Sprawdź czy potrzebna aktualizacja
        if (timestamp - this.lastUpdate > this.config.updateInterval) {
            await this.updateCalendar();
        }
        // Znajdź następne wydarzenie
        return this.events.find(event => event.timestamp > timestamp &&
            (symbols.length === 0 || event.impact.some(s => symbols.includes(s)))) || null;
    }
    isBlackoutPeriod(timestamp = Date.now(), symbols = []) {
        // Znajdź wszystkie wydarzenia w okolicy timestampu
        const relevantEvents = this.events.filter(event => {
            const eventStart = event.timestamp - event.blackoutBefore;
            const eventEnd = event.timestamp + event.blackoutAfter;
            return timestamp >= eventStart && timestamp <= eventEnd &&
                (symbols.length === 0 || event.impact.some(s => symbols.includes(s)));
        });
        return relevantEvents.length > 0;
    }
    async updateCalendar() {
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
        }
        catch (error) {
            this.logger.error('[Calendar] Błąd aktualizacji kalendarza', error);
        }
    }
    processEvents(data) {
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
    getEventType(importance) {
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
    getEventImpact(event) {
        // Przykładowa logika określania wpływu wydarzenia
        const impact = [];
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
exports.MarketCalendar = MarketCalendar;

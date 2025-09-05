export interface DataResponse {
    timestamp: number;
    data: any;
}

export interface ExchangeResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface LogEntry {
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
}
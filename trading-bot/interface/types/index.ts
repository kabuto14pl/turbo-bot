export interface CLIOptions {
    command: string;
    options?: Record<string, any>;
}

export interface GUIConfig {
    theme: string;
    layout: string;
    widgets: string[];
}

export interface RESTResponse {
    status: string;
    data?: any;
    error?: string;
}
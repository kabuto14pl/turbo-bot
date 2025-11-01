/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * PHASE C.3 - Enterprise Monitoring & Alerting
 * Grafana Dashboard Template Manager
 * 
 * Features:
 * - Automated dashboard deployment to Grafana
 * - Template variable management
 * - Dashboard versioning and updates
 * - Datasource configuration
 * - Organization and folder management
 */

import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

interface GrafanaDashboard {
    dashboard: any;
    folderId?: number;
    folderUid?: string;
    message?: string;
    overwrite?: boolean;
}

interface GrafanaConfig {
    url: string;
    apiKey: string;
    organization?: string;
    timeout?: number;
}

interface DashboardTemplate {
    name: string;
    file: string;
    title: string;
    description: string;
    tags: string[];
    folder?: string;
    variables?: { [key: string]: any };
}

interface DeploymentResult {
    success: boolean;
    dashboardId?: number;
    dashboardUid?: string;
    url?: string;
    error?: string;
    warnings?: string[];
}

export class GrafanaDashboardManager {
    private grafanaClient: AxiosInstance;
    private config: GrafanaConfig;
    private dashboardsPath: string;
    private templates: Map<string, DashboardTemplate> = new Map();

    constructor(config: GrafanaConfig, dashboardsPath?: string) {
        this.config = {
            timeout: 30000,
            ...config
        };

        this.dashboardsPath = dashboardsPath || path.join(__dirname, 'grafana_dashboards');

        this.grafanaClient = axios.create({
            baseURL: this.config.url,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        this.initializeTemplates();
        console.log('[GRAFANA MANAGER] Dashboard manager initialized');
        console.log(`[GRAFANA MANAGER] Grafana URL: ${this.config.url}`);
        console.log(`[GRAFANA MANAGER] Dashboards path: ${this.dashboardsPath}`);
    }

    // ==================== INITIALIZATION ====================

    private initializeTemplates(): void {
        const templates: DashboardTemplate[] = [
            {
                name: 'executive_overview',
                file: 'executive_overview.json',
                title: 'Trading Bot - Executive Overview',
                description: 'High-level overview dashboard for executives and stakeholders',
                tags: ['trading', 'overview', 'executive'],
                folder: 'Trading Bot',
                variables: {
                    refresh_interval: '30s',
                    time_range: 'now-1h'
                }
            },
            {
                name: 'technical_performance',
                file: 'technical_performance.json',
                title: 'Trading Bot - Technical Performance',
                description: 'Detailed technical performance metrics for developers and operations',
                tags: ['trading', 'technical', 'performance'],
                folder: 'Trading Bot',
                variables: {
                    refresh_interval: '15s',
                    time_range: 'now-6h'
                }
            },
            {
                name: 'alert_management',
                file: 'alert_management.json',
                title: 'Trading Bot - Alert Management',
                description: 'Alert monitoring and management dashboard',
                tags: ['trading', 'alerts', 'monitoring'],
                folder: 'Trading Bot',
                variables: {
                    refresh_interval: '30s',
                    time_range: 'now-24h'
                }
            }
        ];

        templates.forEach(template => {
            this.templates.set(template.name, template);
        });
    }

    // ==================== DASHBOARD OPERATIONS ====================

    public async deployAllDashboards(): Promise<Map<string, DeploymentResult>> {
        console.log('[GRAFANA MANAGER] Starting deployment of all dashboards...');
        
        const results = new Map<string, DeploymentResult>();
        
        // Ensure folders exist
        await this.ensureFoldersExist();
        
        // Deploy each dashboard
        for (const [name, template] of this.templates) {
            try {
                console.log(`[GRAFANA MANAGER] Deploying dashboard: ${name}`);
                const result = await this.deployDashboard(name);
                results.set(name, result);
                
                if (result.success) {
                    console.log(`[GRAFANA MANAGER] ✅ Successfully deployed: ${name}`);
                    console.log(`[GRAFANA MANAGER] Dashboard URL: ${result.url}`);
                } else {
                    console.error(`[GRAFANA MANAGER] ❌ Failed to deploy: ${name} - ${result.error}`);
                }
            } catch (error) {
                console.error(`[GRAFANA MANAGER] ❌ Deployment error for ${name}:`, error);
                results.set(name, {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        
        // Summary
        const successful = Array.from(results.values()).filter(r => r.success).length;
        const total = results.size;
        
        console.log(`[GRAFANA MANAGER] Deployment complete: ${successful}/${total} dashboards deployed successfully`);
        
        return results;
    }

    public async deployDashboard(templateName: string): Promise<DeploymentResult> {
        const template = this.templates.get(templateName);
        if (!template) {
            return {
                success: false,
                error: `Template ${templateName} not found`
            };
        }

        try {
            // Load dashboard JSON
            const dashboardPath = path.join(this.dashboardsPath, template.file);
            const dashboardJson = await this.loadDashboardFile(dashboardPath);
            
            // Apply template variables
            const processedDashboard = this.applyTemplateVariables(dashboardJson, template);
            
            // Get folder ID if specified
            let folderId: number | undefined;
            if (template.folder) {
                folderId = await this.getFolderId(template.folder);
            }
            
            // Deploy to Grafana
            const deployPayload: GrafanaDashboard = {
                dashboard: processedDashboard.dashboard,
                folderId,
                message: `Deployed by Trading Bot Dashboard Manager`,
                overwrite: true
            };
            
            const response = await this.grafanaClient.post('/api/dashboards/db', deployPayload);
            
            const result: DeploymentResult = {
                success: true,
                dashboardId: response.data.id,
                dashboardUid: response.data.uid,
                url: `${this.config.url}/d/${response.data.uid}/${response.data.slug}`,
                warnings: []
            };
            
            // Validate deployment
            const validationWarnings = await this.validateDashboard(response.data.uid);
            if (validationWarnings.length > 0) {
                result.warnings = validationWarnings;
            }
            
            return result;
            
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Unknown deployment error'
            };
        }
    }

    private async loadDashboardFile(filePath: string): Promise<any> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Dashboard file not found: ${filePath}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    }

    private applyTemplateVariables(dashboard: any, template: DashboardTemplate): any {
        const processed = JSON.parse(JSON.stringify(dashboard)); // Deep clone
        
        if (template.variables) {
            // Apply refresh interval
            if (template.variables.refresh_interval) {
                processed.dashboard.refresh = template.variables.refresh_interval;
            }
            
            // Apply time range
            if (template.variables.time_range) {
                processed.dashboard.time = {
                    ...processed.dashboard.time,
                    from: template.variables.time_range,
                    to: 'now'
                };
            }
        }
        
        // Ensure datasource is set to Prometheus
        this.updateDatasourceReferences(processed.dashboard);
        
        return processed;
    }

    private updateDatasourceReferences(dashboard: any): void {
        // Update panel targets to use Prometheus datasource
        if (dashboard.panels) {
            dashboard.panels.forEach((panel: any) => {
                if (panel.targets) {
                    panel.targets.forEach((target: any) => {
                        if (!target.datasource) {
                            target.datasource = 'Prometheus';
                        }
                    });
                }
                
                // Handle row panels with nested panels
                if (panel.panels) {
                    panel.panels.forEach((subPanel: any) => {
                        if (subPanel.targets) {
                            subPanel.targets.forEach((target: any) => {
                                if (!target.datasource) {
                                    target.datasource = 'Prometheus';
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Update templating datasources
        if (dashboard.templating?.list) {
            dashboard.templating.list.forEach((template: any) => {
                if (template.type === 'query' && !template.datasource) {
                    template.datasource = 'Prometheus';
                }
            });
        }
        
        // Update annotation datasources
        if (dashboard.annotations?.list) {
            dashboard.annotations.list.forEach((annotation: any) => {
                if (!annotation.datasource) {
                    annotation.datasource = 'Prometheus';
                }
            });
        }
    }

    // ==================== FOLDER MANAGEMENT ====================

    private async ensureFoldersExist(): Promise<void> {
        const uniqueFolders = new Set<string>();
        
        for (const template of this.templates.values()) {
            if (template.folder) {
                uniqueFolders.add(template.folder);
            }
        }
        
        for (const folderName of uniqueFolders) {
            await this.ensureFolderExists(folderName);
        }
    }

    private async ensureFolderExists(folderName: string): Promise<number> {
        try {
            // Check if folder exists
            const folderId = await this.getFolderId(folderName);
            if (folderId !== undefined) {
                return folderId;
            }
            
            // Create folder
            const response = await this.grafanaClient.post('/api/folders', {
                title: folderName,
                uid: folderName.toLowerCase().replace(/\s+/g, '-')
            });
            
            console.log(`[GRAFANA MANAGER] Created folder: ${folderName} (ID: ${response.data.id})`);
            return response.data.id;
            
        } catch (error: any) {
            if (error.response?.status === 409) {
                // Folder already exists, get its ID
                return await this.getFolderId(folderName) || 0;
            }
            throw error;
        }
    }

    private async getFolderId(folderName: string): Promise<number | undefined> {
        try {
            const response = await this.grafanaClient.get('/api/folders');
            const folder = response.data.find((f: any) => f.title === folderName);
            return folder?.id;
        } catch (error) {
            console.warn(`[GRAFANA MANAGER] Could not get folder ID for: ${folderName}`);
            return undefined;
        }
    }

    // ==================== VALIDATION ====================

    private async validateDashboard(dashboardUid: string): Promise<string[]> {
        const warnings: string[] = [];
        
        try {
            // Get dashboard details
            const response = await this.grafanaClient.get(`/api/dashboards/uid/${dashboardUid}`);
            const dashboard = response.data.dashboard;
            
            // Check for common issues
            if (!dashboard.panels || dashboard.panels.length === 0) {
                warnings.push('Dashboard has no panels');
            }
            
            // Check for panels without targets
            let panelsWithoutTargets = 0;
            dashboard.panels?.forEach((panel: any) => {
                if (panel.type !== 'row' && (!panel.targets || panel.targets.length === 0)) {
                    panelsWithoutTargets++;
                }
            });
            
            if (panelsWithoutTargets > 0) {
                warnings.push(`${panelsWithoutTargets} panels have no data targets`);
            }
            
            // Check templating variables
            if (dashboard.templating?.list?.length > 0) {
                const invalidVariables = dashboard.templating.list.filter((v: any) => 
                    v.type === 'query' && !v.query
                );
                
                if (invalidVariables.length > 0) {
                    warnings.push(`${invalidVariables.length} template variables have no query`);
                }
            }
            
        } catch (error) {
            warnings.push('Could not validate dashboard after deployment');
        }
        
        return warnings;
    }

    // ==================== UTILITY METHODS ====================

    public async testConnection(): Promise<boolean> {
        try {
            await this.grafanaClient.get('/api/health');
            console.log('[GRAFANA MANAGER] ✅ Grafana connection test successful');
            return true;
        } catch (error: any) {
            console.error('[GRAFANA MANAGER] ❌ Grafana connection test failed:', error.message);
            return false;
        }
    }

    public async getDashboardList(): Promise<any[]> {
        try {
            const response = await this.grafanaClient.get('/api/search?type=dash-db');
            return response.data;
        } catch (error) {
            console.error('[GRAFANA MANAGER] Failed to get dashboard list:', error);
            return [];
        }
    }

    public async deleteDashboard(dashboardUid: string): Promise<boolean> {
        try {
            await this.grafanaClient.delete(`/api/dashboards/uid/${dashboardUid}`);
            console.log(`[GRAFANA MANAGER] Deleted dashboard: ${dashboardUid}`);
            return true;
        } catch (error) {
            console.error(`[GRAFANA MANAGER] Failed to delete dashboard ${dashboardUid}:`, error);
            return false;
        }
    }

    public getTemplates(): DashboardTemplate[] {
        return Array.from(this.templates.values());
    }

    public getTemplate(name: string): DashboardTemplate | undefined {
        return this.templates.get(name);
    }

    public async getSystemInfo(): Promise<any> {
        try {
            const [health, version, datasources] = await Promise.all([
                this.grafanaClient.get('/api/health'),
                this.grafanaClient.get('/api/admin/stats'),
                this.grafanaClient.get('/api/datasources')
            ]);
            
            return {
                health: health.data,
                stats: version.data,
                datasources: datasources.data,
                templatesCount: this.templates.size
            };
        } catch (error) {
            console.error('[GRAFANA MANAGER] Failed to get system info:', error);
            return null;
        }
    }
}

// Default configuration
export const DefaultGrafanaConfig = {
    url: process.env.GRAFANA_URL || 'http://localhost:3000',
    apiKey: process.env.GRAFANA_API_KEY || '',
    timeout: 30000
};

export type { GrafanaConfig, DashboardTemplate, DeploymentResult };

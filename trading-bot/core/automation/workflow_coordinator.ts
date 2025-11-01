/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🔄 WORKFLOW COORDINATOR
 * 
 * Coordinates the execution of trading bot workflows and automation sequences.
 */

export interface WorkflowStep {
    name: string;
    execute: () => Promise<void>;
    rollback?: () => Promise<void>;
}

export interface WorkflowConfig {
    name: string;
    steps: WorkflowStep[];
    onSuccess?: () => Promise<void>;
    onFailure?: (error: Error) => Promise<void>;
}

export class WorkflowCoordinator {
    private workflows: Map<string, WorkflowConfig> = new Map();
    private isRunning = false;

    constructor() {
        console.log('[WORKFLOW] Coordinator initialized');
    }

    registerWorkflow(config: WorkflowConfig): void {
        this.workflows.set(config.name, config);
        console.log(`[WORKFLOW] Registered workflow: ${config.name}`);
    }

    async executeWorkflow(name: string): Promise<void> {
        if (this.isRunning) {
            throw new Error('Workflow already running');
        }

        const workflow = this.workflows.get(name);
        if (!workflow) {
            throw new Error(`Workflow not found: ${name}`);
        }

        this.isRunning = true;
        console.log(`[WORKFLOW] Starting workflow: ${name}`);

        try {
            for (const step of workflow.steps) {
                console.log(`[WORKFLOW] Executing step: ${step.name}`);
                await step.execute();
            }

            if (workflow.onSuccess) {
                await workflow.onSuccess();
            }

            console.log(`[WORKFLOW] Completed workflow: ${name}`);
        } catch (error) {
            console.error(`[WORKFLOW] Error in workflow ${name}:`, error);
            
            if (workflow.onFailure) {
                await workflow.onFailure(error as Error);
            }
            
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    isWorkflowRunning(): boolean {
        return this.isRunning;
    }

    getRegisteredWorkflows(): string[] {
        return Array.from(this.workflows.keys());
    }
}
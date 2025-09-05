"use strict";
/**
 * 🔄 WORKFLOW COORDINATOR
 *
 * Coordinates the execution of trading bot workflows and automation sequences.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCoordinator = void 0;
class WorkflowCoordinator {
    constructor() {
        this.workflows = new Map();
        this.isRunning = false;
        console.log('[WORKFLOW] Coordinator initialized');
    }
    registerWorkflow(config) {
        this.workflows.set(config.name, config);
        console.log(`[WORKFLOW] Registered workflow: ${config.name}`);
    }
    async executeWorkflow(name) {
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
        }
        catch (error) {
            console.error(`[WORKFLOW] Error in workflow ${name}:`, error);
            if (workflow.onFailure) {
                await workflow.onFailure(error);
            }
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    isWorkflowRunning() {
        return this.isRunning;
    }
    getRegisteredWorkflows() {
        return Array.from(this.workflows.keys());
    }
}
exports.WorkflowCoordinator = WorkflowCoordinator;

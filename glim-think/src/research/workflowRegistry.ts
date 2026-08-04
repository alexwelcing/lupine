import { mlipWorkflowAdapter } from "./mlipWorkflow";
import { mlipBaselineWorkflowAdapter } from "./mlipBaselineWorkflow";
import { mlipDiscoveryWorkflowAdapter } from "./mlipDiscoveryWorkflow";
import type {
  ResearchWorkflowAdapter,
  ResearchWorkflowDescriptor,
} from "./workflowTypes";

const adapters: ResearchWorkflowAdapter[] = [
  mlipBaselineWorkflowAdapter,
  mlipDiscoveryWorkflowAdapter,
  mlipWorkflowAdapter,
];

const adapterById = new Map(adapters.map((adapter) => [adapter.workflow_id, adapter]));

export function getResearchWorkflowAdapter(workflowId: string): ResearchWorkflowAdapter | null {
  return adapterById.get(workflowId) ?? null;
}

export function listResearchWorkflowDescriptors(): ResearchWorkflowDescriptor[] {
  return adapters.map((adapter) => adapter.describe());
}

export function listResearchWorkflowAdapters(): ResearchWorkflowAdapter[] {
  return adapters;
}

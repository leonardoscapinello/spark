import { createAutomationRunsCollection, createAutomationRunStepsCollection, createAutomationsCollection, createAutomationVersionsCollection, type AutomationRunsCollection, type AutomationRunStepsCollection, type AutomationsCollection, type AutomationVersionsCollection } from "@spark/data";
let automations: AutomationsCollection | undefined;
let versions: AutomationVersionsCollection | undefined;
let runs: AutomationRunsCollection | undefined;
let steps: AutomationRunStepsCollection | undefined;
export function getAutomationsCollection(): AutomationsCollection { automations ??= createAutomationsCollection(); return automations; }
export function getAutomationVersionsCollection(): AutomationVersionsCollection { versions ??= createAutomationVersionsCollection(); return versions; }
export function getAutomationRunsCollection(): AutomationRunsCollection { runs ??= createAutomationRunsCollection(); return runs; }
export function getAutomationRunStepsCollection(): AutomationRunStepsCollection { steps ??= createAutomationRunStepsCollection(); return steps; }

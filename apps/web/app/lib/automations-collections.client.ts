import { createAutomationsCollection, createAutomationVersionsCollection, type AutomationsCollection, type AutomationVersionsCollection } from "@spark/data";
let automations: AutomationsCollection | undefined;
let versions: AutomationVersionsCollection | undefined;
export function getAutomationsCollection(): AutomationsCollection { automations ??= createAutomationsCollection(); return automations; }
export function getAutomationVersionsCollection(): AutomationVersionsCollection { versions ??= createAutomationVersionsCollection(); return versions; }

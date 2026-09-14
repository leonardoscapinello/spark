import { createStageFieldRulesCollection, type StageFieldRulesCollection } from "@spark/data";
let rules: StageFieldRulesCollection | undefined;
export function getStageFieldRulesCollection(): StageFieldRulesCollection { rules ??= createStageFieldRulesCollection(); return rules; }

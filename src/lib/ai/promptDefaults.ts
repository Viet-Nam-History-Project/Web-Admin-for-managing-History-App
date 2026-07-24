export interface PromptLayers {
  systemPrompt: string;
  queryNormalizationInstruction: string;
  answerPlanningInstruction: string;
  presentationInstruction: string;
  outputContract: string;
}

export const EMPTY_PROMPT_LAYERS: PromptLayers = {
  systemPrompt: '',
  queryNormalizationInstruction: '',
  answerPlanningInstruction: '',
  presentationInstruction: '',
  outputContract: '',
};

export function normalizePromptLayers(
  data: Record<string, unknown>,
  fallback: PromptLayers = EMPTY_PROMPT_LAYERS,
): PromptLayers {
  return {
    systemPrompt: typeof data.systemPrompt === 'string' && data.systemPrompt.trim()
      ? data.systemPrompt
      : fallback.systemPrompt,
    queryNormalizationInstruction:
      typeof data.queryNormalizationInstruction === 'string'
      && data.queryNormalizationInstruction.trim()
        ? data.queryNormalizationInstruction
        : fallback.queryNormalizationInstruction,
    answerPlanningInstruction:
      typeof data.answerPlanningInstruction === 'string'
      && data.answerPlanningInstruction.trim()
        ? data.answerPlanningInstruction
        : fallback.answerPlanningInstruction,
    presentationInstruction:
      typeof data.presentationInstruction === 'string' && data.presentationInstruction.trim()
        ? data.presentationInstruction
        : fallback.presentationInstruction,
    outputContract: typeof data.outputContract === 'string' && data.outputContract.trim()
      ? data.outputContract
      : fallback.outputContract,
  };
}

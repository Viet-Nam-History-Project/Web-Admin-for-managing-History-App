export interface AiProvider {
  generateText(prompt: string, context?: string): Promise<string>;
  generateQuiz(content: string): Promise<unknown>;
  evaluateAnswer(question: string, answer: string, context?: string): Promise<unknown>;
}

export const aiAdminService = {
  getProvider(): AiProvider {
    return {
      async generateText() {
        throw new Error('AI provider chưa cấu hình. Hãy thêm AI_PROVIDER_API_KEY và adapter.');
      },
      async generateQuiz() {
        throw new Error('AI provider chưa cấu hình.');
      },
      async evaluateAnswer() {
        throw new Error('AI provider chưa cấu hình.');
      },
    };
  },
};

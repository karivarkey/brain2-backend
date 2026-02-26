/**
 * Onboarding service
 * Transforms user information into structured mutations for user.md
 */

import { GeminiProvider } from "../../providers/gemini.provider";
import type { MemoryMutation } from "../../core";

export interface OnboardRequest {
  userId?: string;
  timezone?: string;
  data: string[]; // Array of user information strings
}

export interface OnboardResponse {
  success: boolean;
  message: string;
  mutations: MemoryMutation[];
  mutationsApplied: number;
}

/**
 * Onboarding system prompt
 * Tells AI to structure user information into user.md mutations
 */
const ONBOARD_SYSTEM_PROMPT = `You are an intelligent onboarding assistant. Your job is to analyze user-provided information and structure it into updates for the user's identity profile (user.md).

The user will provide a list of facts, preferences, demographics, and other information about themselves.

Your task is to:
1. Analyze and categorize the information
2. Extract key identity signals (age, profession, location, personality traits, preferences)
3. Generate structured mutations that update the user.md file
4. Make the profile comprehensive and accurate based on the provided information

Return ONLY a JSON object with this structure (no markdown code fences):

{
  "mutations": [
    {
      "action": "create" | "update",
      "file": "user",
      "changes": {
        "metadata": { "field": "value" },
        "append": "Content to add"
      }
    }
  ],
  "summary": "Brief summary of what was extracted"
}

IMPORTANT:
- The "mutations" array MUST create or update user.md
- Focus on identity, preferences, skills, and life context
- Be specific and use the exact information provided
- Include metadata updates for identity signals
- For new sections, use markdown formatting with ## headers
- Return valid JSON only
`;

export class OnboardingService {
  private provider: GeminiProvider;

  constructor() {
    this.provider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY!,
      modelId: "gemini-2.0-flash",
      useJsonMode: false,
    });
  }

  /**
   * Process onboarding data and generate mutations
   */
  async processOnboarding(request: OnboardRequest): Promise<OnboardResponse> {
    try {
      const dataStr = request.data
        .map((item, i) => `${i + 1}. ${item}`)
        .join("\n");

      const userPrompt = `Here is the information about a user that needs to be structured into their identity profile:

${dataStr}

Please analyze this information and generate mutations to create/update their user.md file with their identity, preferences, skills, and life context.`;

      // Stream the response from Gemini
      const response = await this.provider.stream([
        { role: "system", content: ONBOARD_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ]);

      // Parse the JSON response
      let cleanedContent = response.trim();

      // Remove markdown code fences if present
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }

      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }

      cleanedContent = cleanedContent.trim();

      const parsed = JSON.parse(cleanedContent) as {
        mutations: MemoryMutation[];
        summary: string;
      };

      return {
        success: true,
        message: `Onboarding complete. ${parsed.mutations.length} mutations generated.`,
        mutations: parsed.mutations,
        mutationsApplied: parsed.mutations.length,
      };
    } catch (error) {
      console.error("Onboarding error:", error);
      throw new Error(
        `Onboarding failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const onboardingService = new OnboardingService();

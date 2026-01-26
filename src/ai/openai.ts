/**
 * OpenAI API client for performance analysis
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Analyze performance data using OpenAI
 */
export async function analyzeWithOpenAI(
  prompt: string,
  options: OpenAIOptions
): Promise<string> {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: 'You are a web performance expert specializing in Lighthouse optimization. You provide specific, actionable advice for improving Core Web Vitals and overall performance scores.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4-turbo-preview',
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new OpenAIError(
      `OpenAI API error (${response.status}): ${error}`,
      response.status
    );
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!data.choices || data.choices.length === 0) {
    throw new OpenAIError('No response from OpenAI API', 500);
  }

  return data.choices[0]?.message?.content || 'No analysis available.';
}

/**
 * Check if an OpenAI API key is valid
 */
export async function checkOpenAIAccess(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Custom error class for OpenAI API errors
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'OpenAIError';
  }

  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  isRateLimit(): boolean {
    return this.statusCode === 429;
  }

  isQuotaExceeded(): boolean {
    return this.statusCode === 402;
  }
}

/**
 * Get a helpful error message for OpenAI errors
 */
export function getOpenAIErrorMessage(error: unknown): string {
  if (error instanceof OpenAIError) {
    if (error.isAuthError()) {
      return 'OpenAI API key is invalid. Please check your OPENAI_API_KEY environment variable.';
    }
    if (error.isRateLimit()) {
      return 'OpenAI rate limit exceeded. Please try again later.';
    }
    if (error.isQuotaExceeded()) {
      return 'OpenAI quota exceeded. Please check your billing settings.';
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred while calling OpenAI API';
}

/**
 * Estimate token count for a prompt (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

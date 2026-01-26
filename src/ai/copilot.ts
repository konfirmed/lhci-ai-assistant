/**
 * GitHub Copilot SDK client for performance analysis
 * Uses the official @github/copilot-sdk for programmatic access to Copilot
 */

// Types for the SDK (dynamic import)
type CopilotClientType = InstanceType<typeof import('@github/copilot-sdk').CopilotClient>;
type CopilotSessionType = InstanceType<typeof import('@github/copilot-sdk').CopilotSession>;

export interface CopilotOptions {
  token?: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

// Singleton client instance for reuse across calls
let clientInstance: CopilotClientType | null = null;
let clientInitPromise: Promise<CopilotClientType> | null = null;

/**
 * Dynamically import the ESM SDK
 * Uses Function to prevent TypeScript from converting to require()
 */
async function importSDK(): Promise<typeof import('@github/copilot-sdk')> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  return dynamicImport('@github/copilot-sdk');
}

/**
 * Get or create the Copilot client singleton
 */
async function getClient(): Promise<CopilotClientType> {
  if (clientInstance && clientInstance.getState() === 'connected') {
    return clientInstance;
  }

  if (clientInitPromise) {
    return clientInitPromise;
  }

  clientInitPromise = (async () => {
    const { CopilotClient } = await importSDK();
    const client = new CopilotClient({
      autoStart: true,
      autoRestart: true,
      logLevel: 'error',
    });

    await client.start();
    clientInstance = client;
    return client;
  })();

  return clientInitPromise;
}

/**
 * Analyze performance data using GitHub Copilot SDK
 */
export async function analyzeWithCopilot(
  prompt: string,
  options: CopilotOptions = {}
): Promise<string> {
  const client = await getClient();
  let session: CopilotSessionType | null = null;

  try {
    // Create a session with the performance expert system message
    session = await client.createSession({
      model: options.model || 'gpt-4o',
      systemMessage: {
        mode: 'append',
        content: 'You are a web performance expert specializing in Lighthouse optimization. You provide specific, actionable advice for improving Core Web Vitals and overall performance scores.',
      },
      streaming: false,
    });

    // Send the prompt and wait for the response
    const timeout = options.timeout || 60000;
    const response = await session.sendAndWait({ prompt }, timeout);

    if (!response) {
      throw new CopilotError('No response received from Copilot', 500);
    }

    return response.data.content || 'No analysis available.';
  } catch (error) {
    if (error instanceof CopilotError) {
      throw error;
    }

    // Map SDK errors to CopilotError
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('not authenticated') || message.includes('auth')) {
      throw new CopilotError('GitHub Copilot authentication failed. Please run `gh auth login` or ensure GITHUB_TOKEN is set.', 401);
    }

    if (message.includes('rate limit') || message.includes('429')) {
      throw new CopilotError('GitHub Copilot rate limit exceeded. Please try again later.', 429);
    }

    throw new CopilotError(`Copilot SDK error: ${message}`, 500);
  } finally {
    // Clean up the session
    if (session) {
      try {
        await session.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Check if Copilot access is available
 */
export async function checkCopilotAccess(_token?: string): Promise<boolean> {
  try {
    const client = await getClient();
    const authStatus = await client.getAuthStatus();
    return authStatus.isAuthenticated;
  } catch {
    return false;
  }
}

/**
 * Stop the Copilot client and clean up resources
 */
export async function stopCopilotClient(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.stop();
    } catch {
      await clientInstance.forceStop();
    } finally {
      clientInstance = null;
      clientInitPromise = null;
    }
  }
}

/**
 * List available models
 */
export async function listCopilotModels(): Promise<string[]> {
  try {
    const client = await getClient();
    const models = await client.listModels();
    return models.map(m => m.id);
  } catch {
    return [];
  }
}

/**
 * Custom error class for Copilot API errors
 */
export class CopilotError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'CopilotError';
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  isRateLimit(): boolean {
    return this.statusCode === 429;
  }
}

/**
 * Get a helpful error message for Copilot errors
 */
export function getCopilotErrorMessage(error: unknown): string {
  if (error instanceof CopilotError) {
    if (error.isAuthError()) {
      return 'GitHub Copilot access denied. Please run `gh auth login` or ensure you have an active Copilot subscription.';
    }
    if (error.isRateLimit()) {
      return 'GitHub Copilot rate limit exceeded. Please try again later.';
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred while calling Copilot SDK';
}

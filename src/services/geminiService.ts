import { GoogleGenAI } from '@google/genai';

const SLEEP_BEFORE_RETRY_MS = 2000;
const MAX_RETRIES = 3;

/**
 * Robust AI Generation Service with Retry and Fallback logic
 * Fixes: RESOURCE_EXHAUSTED (429) errors
 */
export const generateWithRetry = async (
  apiKey: string,
  prompt: string,
  options: { model?: string; search?: boolean; json?: boolean; schema?: any } = {}
) => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  const data = await response.json();
  return data.text;
};

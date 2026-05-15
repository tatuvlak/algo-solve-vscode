import axios, { AxiosError } from 'axios';
import { log, logError } from '../utils/logger';

export interface OllamaResponse {
  response: string;
}

export async function queryOllama(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  const url = `${endpoint.replace(/\/$/, '')}/api/generate`;

  log(`Sending request to Ollama at ${url} using model "${model}"`);

  try {
    const response = await axios.post<OllamaResponse>(
      url,
      {
        model,
        prompt,
        stream: false,
      },
      {
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const result = response.data?.response;
    if (typeof result !== 'string') {
      throw new Error('Unexpected response format from Ollama');
    }

    log('Received response from Ollama');
    return result;
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
        throw new Error(
          `Cannot connect to Ollama at ${endpoint}. Make sure Ollama is running.`
        );
      }
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        throw new Error(
          `Request to Ollama timed out after ${timeoutMs / 1000}s. Try increasing algoSolve.requestTimeout.`
        );
      }
      const status = err.response?.status;
      const body = err.response?.data;
      throw new Error(
        `Ollama request failed (HTTP ${status}): ${JSON.stringify(body)}`
      );
    }
    logError('Unexpected error communicating with Ollama', err);
    throw err;
  }
}

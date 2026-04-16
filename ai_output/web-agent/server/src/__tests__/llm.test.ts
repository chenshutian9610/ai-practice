import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chat, chatStream } from '../services/llm.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LLM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chat (sync)', () => {
    it('should throw error if endpoint is not configured', async () => {
      await expect(
        chat({ endpoint: '', apiKey: 'key', model: 'gpt-3.5-turbo' }, [])
      ).rejects.toThrow('LLM not configured');
    });

    it('should throw error if apiKey is not configured', async () => {
      await expect(
        chat({ endpoint: 'https://api.example.com', apiKey: '', model: 'gpt-3.5-turbo' }, [])
      ).rejects.toThrow('LLM not configured');
    });

    it('should return content on successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello, world!' } }],
        }),
      });

      const result = await chat(
        { endpoint: 'https://api.example.com', apiKey: 'test-key', model: 'gpt-3.5-turbo' },
        [{ role: 'user', content: 'Hi' }]
      );

      expect(result.content).toBe('Hello, world!');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should throw error on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      await expect(
        chat({ endpoint: 'https://api.example.com', apiKey: 'invalid', model: 'gpt-3.5-turbo' }, [])
      ).rejects.toThrow('LLM API error: 401');
    });
  });

  describe('chatStream', () => {
    it('should throw error if not configured', async () => {
      const generator = chatStream(
        { endpoint: '', apiKey: 'key', model: 'gpt-3.5-turbo' },
        []
      );

      await expect(generator.next()).rejects.toThrow('LLM not configured');
    });

    it('should yield chunks from stream', async () => {
      // Create a mock readable stream
      const chunks = ['Hello', ' ', 'world'];
      let index = 0;

      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (index < chunks.length) {
            const chunk = chunks[index++];
            return { done: false, value: new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"${chunk}"}}]}\n\n`) };
          }
          return { done: true, value: undefined };
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const generator = chatStream(
        { endpoint: 'https://api.example.com', apiKey: 'test-key', model: 'gpt-3.5-turbo' },
        [{ role: 'user', content: 'Hi' }]
      );

      const results: string[] = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toEqual(['Hello', ' ', 'world']);
    });
  });

  describe('System Prompt injection', () => {
    it('should pass messages to LLM API correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      await chat(
        { endpoint: 'https://api.example.com', apiKey: 'test-key', model: 'gpt-3.5-turbo' },
        [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ]
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Messages should be passed through correctly
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are a helpful assistant');
      expect(body.messages[1].role).toBe('user');
    });
  });
});
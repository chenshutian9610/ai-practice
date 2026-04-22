import { fetch, Agent } from 'undici';

// Test without dispatcher (should use proxy if env is set)
console.log('Testing WITHOUT dispatcher:');
const response1 = await fetch('http://localhost:10000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-dKYb9Bp4OfpCzBw4xfe5g6tTx7tFfEwgUBzcJEhOf7WEmK2n',
  },
  body: JSON.stringify({
    model: 'silicon/qwen3-8b',
    messages: [{ role: 'user', content: 'hi' }],
    stream: false,
  }),
});
console.log('Status:', response1.status);
console.log('Data:', await response1.json());

// Test with custom Agent
console.log('\nTesting WITH custom Agent:');
const agent = new Agent();
const response2 = await fetch('http://localhost:10000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-dKYb9Bp4OfpCzBw4xfe5g6tTx7tFfEwgUBzcJEhOf7WEmK2n',
  },
  body: JSON.stringify({
    model: 'silicon/qwen3-8b',
    messages: [{ role: 'user', content: 'hi' }],
    stream: false,
  }),
  dispatcher: agent,
});
console.log('Status:', response2.status);

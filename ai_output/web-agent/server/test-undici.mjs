import { fetch, Agent } from 'undici';

const agent = new Agent({
  keepAliveTimeout: 60000,
});

const response = await fetch('http://localhost:10000/v1/chat/completions', {
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

const data = await response.json();
console.log('Response:', JSON.stringify(data, null, 2));

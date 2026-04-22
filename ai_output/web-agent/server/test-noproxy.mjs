import { fetch, Agent } from 'undici';

// First test: without setting NO_PROXY
console.log('Test 1: Without NO_PROXY modification');
const start1 = Date.now();
try {
  const agent = new Agent({});
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
  console.log('Response status:', response.status);
  console.log('Time taken:', Date.now() - start1, 'ms');
} catch (e) {
  console.log('Error:', e.message);
  console.log('Time taken:', Date.now() - start1, 'ms');
}

// Second test: with NO_PROXY set
console.log('\nTest 2: With NO_PROXY modification');
process.env.NO_PROXY = 'localhost,127.0.0.1';
const start2 = Date.now();
try {
  const agent = new Agent({});
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
  console.log('Response status:', response.status);
  console.log('Time taken:', Date.now() - start2, 'ms');
} catch (e) {
  console.log('Error:', e.message);
  console.log('Time taken:', Date.now() - start2, 'ms');
}

import { fetch, Agent } from 'undici';

console.log('HTTP_PROXY:', process.env.HTTP_PROXY);
console.log('http_proxy:', process.env.http_proxy);
console.log('NO_PROXY:', process.env.NO_PROXY);

// Test with custom Agent
console.log('\nTesting with custom Agent:');
const agent = new Agent({
  keepAliveTimeout: 60000,
});

const start = Date.now();
try {
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
  console.log('Time taken:', Date.now() - start, 'ms');
} catch (e) {
  console.log('Error:', e.message);
  console.log('Time taken:', Date.now() - start, 'ms');
}

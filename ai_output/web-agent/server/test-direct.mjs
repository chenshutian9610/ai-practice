import { fetch, Agent } from 'undici';

// Create a proxy agent that routes directly without proxy
// Actually, let's just delete the http_proxy env var temporarily
const originalProxy = process.env.http_proxy;
const originalHTTPProxy = process.env.HTTP_PROXY;
delete process.env.http_proxy;
delete process.env.HTTP_PROXY;

console.log('http_proxy after delete:', process.env.http_proxy);
console.log('HTTP_PROXY after delete:', process.env.HTTP_PROXY);

const start = Date.now();
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
  console.log('Time taken:', Date.now() - start, 'ms');
} catch (e) {
  console.log('Error:', e.message);
  console.log('Time taken:', Date.now() - start, 'ms');
}

// Restore
process.env.http_proxy = originalProxy;
process.env.HTTP_PROXY = originalHTTPProxy;

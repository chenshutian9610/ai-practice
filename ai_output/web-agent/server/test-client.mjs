import http from 'http';

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/sessions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const session = JSON.parse(data);
    console.log('Session:', session.id);

    // Now test streaming
    const streamReq = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/chat/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (streamRes) => {
      console.log('Stream status:', streamRes.statusCode);
      streamRes.on('data', (chunk) => {
        console.log('Data:', chunk.toString().slice(0, 200));
      });
      streamRes.on('end', () => {
        console.log('Stream ended');
      });
    });

    streamReq.on('error', (err) => {
      console.log('Stream error:', err.message);
    });

    streamReq.write(JSON.stringify({
      sessionId: session.id,
      content: 'say hello',
    }));
    streamReq.end();

    // Keep process alive
    setTimeout(() => {}, 30000);
  });
});

req.on('error', (err) => {
  console.log('Error:', err.message);
});

req.write(JSON.stringify({ title: 'test' }));
req.end();

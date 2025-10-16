const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Network Test</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
        }
        h1 { margin: 0 0 1rem 0; font-size: 3rem; }
        p { margin: 0.5rem 0; font-size: 1.2rem; }
        .info { margin-top: 2rem; font-size: 0.9rem; opacity: 0.8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ เชื่อมต่อสำเร็จ!</h1>
        <p>Network Test Server</p>
        <p>Port: 8080</p>
        <p>IP: 192.168.1.181</p>
        <div class="info">
          <p>ถ้าคุณเห็นหน้านี้แสดงว่า:</p>
          <p>1. โทรศัพท์เชื่อมต่อ WiFi ได้ถูกต้อง</p>
          <p>2. Windows Firewall ไม่ได้บล็อก</p>
          <p>3. Network routing ทำงานปกติ</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://192.168.1.181:${PORT}`);
  console.log(`\nOpen this URL on your mobile phone to test connectivity.`);
});

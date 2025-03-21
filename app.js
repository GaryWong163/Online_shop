const express = require('express');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const port = 3000;

  // Serve static files from the 'public' directory
  server.use(express.static(path.join(__dirname, 'Online_shop')));

  server.use('/api', createProxyMiddleware({
    target: 'http://13.236.199.22',
    changeOrigin: true,
  }));

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`Server is running on http://localhost:${port}`);
  });
});
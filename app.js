const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', createProxyMiddleware({
    target: 'http://13.236.199.22',
    changeOrigin: true,
  }));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
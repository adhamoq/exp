const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxuEEHDR_5mggc3XKlwTSxw2tK664M_Rxry_gAYg9Llyc-AF46eCVpNzk1cz0jI8hKx/exec';

app.post('/submit', async (req, res) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

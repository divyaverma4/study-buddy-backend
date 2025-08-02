// proxy.js
const express = require('express');
const fetch = require('node-fetch'); // if using Node <18
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const API_KEY = process.env.WORDS_API_KEY;
const API_HOST = 'wordsapiv1.p.rapidapi.com/words/';

app.use(cors()); // Allow frontend to access
app.use(express.json());

app.get('/api/word/:word', async (req, res) => {
  const word = req.params.word;

  try {
    const response = await fetch(`https://${API_HOST}/words/${word}/definitions`, {
  headers: {
    'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com',
    'X-RapidAPI-Key': API_KEY
  }
});


    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching word data:', error);
    res.status(500).json({ error: 'Failed to fetch word data' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

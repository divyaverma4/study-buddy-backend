// proxy.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // if using Node <18
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const API_KEY = process.env.WORDS_API_KEY;
const API_HOST = 'wordsapiv1.p.rapidapi.com';

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


import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateQuizQuestion(word) {
  const prompt = `
Generate a multiple-choice question for the SAT word "${word}". 
Include:
- a question sentence,
- four answer options labeled A, B, C, D,
- exactly one correct answer,
- specify the correct answer letter.

Format your response as JSON like this:

{
  "question": "What is the best definition of 'abate'?",
  "options": {
    "A": "To increase in intensity",
    "B": "To become less intense",
    "C": "To confuse or perplex",
    "D": "To support or encourage"
  },
  "correctAnswer": "B"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // or "gpt-4" or "gpt-3.5-turbo"
    messages: [
      { role: "system", content: "You create SAT vocabulary quiz questions." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  // Parse JSON from response
  const text = response.choices[0].message.content;
  try {
    const quizQuestion = JSON.parse(text);
    return quizQuestion;
  } catch {
    console.error("Failed to parse JSON:", text);
    return null;
  }
}

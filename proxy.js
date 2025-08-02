require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // Optional if Node <18
const cors = require('cors');
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3001;

const WORDS_API_KEY = process.env.WORDS_API_KEY;
const WORDS_API_HOST = 'wordsapiv1.p.rapidapi.com';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// ========== Route 1: WordsAPI Definition ==========
app.get('/api/word/:word', async (req, res) => {
  const word = req.params.word;

  try {
    const response = await fetch(`https://${WORDS_API_HOST}/words/${word}/definitions`, {
      headers: {
        'X-RapidAPI-Host': WORDS_API_HOST,
        'X-RapidAPI-Key': WORDS_API_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'WordsAPI request failed' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching word data:', error);
    res.status(500).json({ error: 'Failed to fetch word data' });
  }
});

// ========== Route 2: OpenAI Quiz Generation ==========
app.get('/api/quiz/:word', async (req, res) => {
  const word = req.params.word;

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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4" or "gpt-3.5-turbo"
      messages: [
        { role: "system", content: "You create SAT vocabulary quiz questions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiText = response.choices[0].message.content;

    let quizQuestion;
    try {
      quizQuestion = JSON.parse(aiText);
    } catch (err) {
      console.error("Failed to parse AI response:", aiText);
      return res.status(500).json({ error: 'Failed to parse AI response JSON' });
    }

    res.json(quizQuestion);

  } catch (error) {
    console.error('Error generating quiz question:', error);
    res.status(500).json({ error: 'Failed to generate quiz question' });
  }
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

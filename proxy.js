require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // For Node <18
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

// ========== Debug Info on Startup ==========
console.log("=== SERVER STARTUP DEBUG ===");
console.log("WORDS_API_KEY loaded?", !!WORDS_API_KEY);
console.log("OPENAI_API_KEY loaded?", !!process.env.OPENAI_API_KEY);
console.log(`Server starting on PORT ${PORT}`);
console.log("============================");

// ========== Route 1: WordsAPI Definition ==========
app.get('/api/word/:word', async (req, res) => {
  const word = req.params.word;
  console.log(`[WordsAPI] Incoming request for word: ${word}`);

  try {
    console.log("[WordsAPI] Sending request to RapidAPI...");
    const response = await fetch(`https://${WORDS_API_HOST}/words/${word}/definitions`, {
      headers: {
        'X-RapidAPI-Host': WORDS_API_HOST,
        'X-RapidAPI-Key': WORDS_API_KEY
      }
    });

    console.log(`[WordsAPI] HTTP status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[WordsAPI] API returned error:", errorText);
      return res.status(response.status).json({ error: 'WordsAPI request failed', details: errorText });
    }

    const data = await response.json();
    console.log("[WordsAPI] Response data received:", data);
    res.json(data);

  } catch (error) {
    console.error('[WordsAPI] Error fetching word data:', error);
    res.status(500).json({ error: 'Failed to fetch word data', details: error.message });
  }
});

// ========== Route 2: OpenAI Quiz Generation ==========
app.get('/api/quiz/:word', async (req, res) => {
  const word = req.params.word;
  console.log(`[OpenAI] Incoming quiz generation request for word: ${word}`);

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
    console.log("[OpenAI] Sending request to API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You create SAT vocabulary quiz questions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    console.log("[OpenAI] API call complete.");
    console.log("[OpenAI] Raw API response:", JSON.stringify(response, null, 2));

    const aiText = response.choices[0]?.message?.content || "";
    console.log("[OpenAI] Extracted text:", aiText);

    let quizQuestion;
    try {
      quizQuestion = JSON.parse(aiText);
    } catch (err) {
      console.error("[OpenAI] Failed to parse AI response as JSON:", aiText);
      return res.status(500).json({ error: 'Failed to parse AI response JSON', raw: aiText });
    }

    console.log("[OpenAI] Final quiz JSON:", quizQuestion);
    res.json(quizQuestion);

  } catch (error) {
    console.error('[OpenAI] Error generating quiz question:', error);
    res.status(500).json({ error: 'Failed to generate quiz question', details: error.message });
  }
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

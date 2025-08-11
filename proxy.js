require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch'); // Needed if Node <18
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

const PORT = process.env.PORT || 3001;
const WORDS_API_KEY = process.env.WORDS_API_KEY;
const WORDS_API_HOST = 'wordsapiv1.p.rapidapi.com';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log("=== SERVER STARTUP DEBUG ===");
console.log("WORDS_API_KEY loaded?", !!WORDS_API_KEY);
console.log("OPENAI_API_KEY loaded?", !!OPENAI_API_KEY);
console.log(`Server starting on PORT ${PORT}`);
console.log("============================");

app.use(cors());
app.use(express.json());

// OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Cache for vocab list
let cachedVocabList = null;

// ======== OpenAI Vocab List Generation Route ========
app.get('/api/vocab', async (req, res) => {
  console.log("[OpenAI] Incoming request for SAT/ACT vocab list");

  const prompt = `
Return ONLY a valid JSON array (no extra text) of exactly 70 of the most common SAT or ACT vocabulary words. 
Each word must be a string in the array.
Example format:
["abate", "acrimony", "benevolent", "disdain", "dissonance"]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You provide clean JSON lists of vocabulary words only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 800, // increased token limit
    });

    let aiText = response.choices[0]?.message?.content?.trim() || "";
    console.log("[OpenAI] Raw vocab list response:", aiText);

    let vocabList;
    try {
      vocabList = JSON.parse(aiText);
      if (typeof vocabList === "string") {
        vocabList = JSON.parse(vocabList);  // double parse for stringified JSON
      }
      if (!Array.isArray(vocabList)) {
        throw new Error("Response is not an array");
      }
    } catch (err) {
      console.error("[OpenAI] Failed to parse vocab list JSON:", err);
      return res.status(500).json({ error: "Failed to parse vocab list JSON", raw: aiText });
    }

    res.json({ words: vocabList });
  } catch (error) {
    console.error("[OpenAI] Error generating vocab list:", error);
    res.status(500).json({ error: "Failed to generate vocab list", details: error.message });
  }
});



// ======== OpenAI Definition Route ========
app.get('/api/word/:word', async (req, res) => {
  const word = req.params.word;
  console.log(`[OpenAI] Incoming definition request for word: ${word}`);

  const prompt = `
Provide a clear, concise dictionary-style definition for the SAT vocabulary word "${word}". 
Keep the definition brief and suitable for a student studying for the SAT.
Respond with JSON in this format:

{
  "word": "${word}",
  "definition": "The definition here."
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You provide dictionary definitions for SAT words." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const aiText = response.choices[0]?.message?.content || "";
    console.log("[OpenAI] Raw definition response:", aiText);

    let defObj;
    try {
      defObj = JSON.parse(aiText);
    } catch (err) {
      console.error("[OpenAI] Failed to parse definition JSON:", aiText);
      return res.json({
        word,
        definition: aiText.replace(/\n/g, " ").trim() || "Definition unavailable."
      });
    }

    res.json(defObj);

  } catch (error) {
    console.error('[OpenAI] Error generating definition:', error);
    res.status(500).json({ error: 'Failed to generate definition', details: error.message });
  }
});

// ======== OpenAI Quiz Generation Route ========
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You create SAT vocabulary quiz questions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiText = response.choices[0]?.message?.content || "";
    console.log("[OpenAI] Extracted text:", aiText);

    let quizQuestion;
    try {
      quizQuestion = JSON.parse(aiText);
    } catch (err) {
      console.error("[OpenAI] Failed to parse AI response as JSON:", aiText);
      return res.status(500).json({ error: 'Failed to parse AI response JSON', raw: aiText });
    }

    res.json(quizQuestion);

  } catch (error) {
    console.error('[OpenAI] Error generating quiz question:', error);
    res.status(500).json({ error: 'Failed to generate quiz question', details: error.message });
  }
});

// ======== Start Server ========
app.listen(PORT, () => {
  console.log(`[DEBUG] Proxy server running on http://localhost:${PORT}`);
});

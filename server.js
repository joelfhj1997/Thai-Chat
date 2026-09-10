require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/translate', async (req, res) => {
    try {
        const { text, tone } = req.body;

        if (!text || !tone) {
            return res.status(400).json({ error: 'Text and tone are required' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set in the .env file' });
        }

        const systemInstruction = `You are an expert native Thai translator. Translate the user's English text into Thai. The requested tone is: "${tone}". Provide ONLY the translated Thai text without any explanations, quotes, or markdown formatting. Ensure the pronouns, particles (like ครับ/ค่ะ, นะ/จ๊ะ), and vocabulary used perfectly match the requested tone. For 'Lovely Couple', use sweet endearing terms; for 'Playful', be fun and energetic; for 'Casual', use natural everyday speech. You must also naturally include relevant emojis in the translation to express the tone and emotion well.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: text,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        res.json({ translation: response.text });

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: error.message || 'Failed to translate' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Make sure you have created a .env file with GEMINI_API_KEY=your_key`);
});

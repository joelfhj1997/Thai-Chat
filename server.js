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

        let response;
        let lastError;
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',
                    contents: text,
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.7,
                    }
                });
                break; // Success
            } catch (err) {
                lastError = err;
                console.warn(`Gemini API attempt ${attempt} failed:`, err.message || err);

                // If error is high demand (503) or rate-limit (429), wait and retry
                const isOverloaded = err.message && (
                    err.message.includes('503') ||
                    err.message.includes('high demand') ||
                    err.message.includes('UNAVAILABLE') ||
                    err.message.includes('429')
                );

                if (attempt < maxAttempts && isOverloaded) {
                    // Wait with backoff: 1.5s then 3s
                    await new Promise(resolve => setTimeout(resolve, attempt * 1500));
                    continue;
                }
                throw err;
            }
        }

        res.json({ translation: response.text });

    } catch (error) {
        console.error('Translation error:', error);
        
        let clientMessage = error.message || 'Failed to translate';
        // Format friendly message if Google's servers are overloaded
        if (clientMessage.includes('503') || clientMessage.includes('high demand') || clientMessage.includes('UNAVAILABLE')) {
            clientMessage = 'Google AI is currently experiencing high demand. Please try again in a few seconds! ⏳';
        }

        res.status(500).json({ error: clientMessage });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Make sure you have created a .env file with GEMINI_API_KEY=your_key`);
});

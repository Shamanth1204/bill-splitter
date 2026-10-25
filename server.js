import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

app.post('/api/scan-receipt', async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            price: { type: Type.NUMBER },
                            quantity: { type: Type.INTEGER }
                        },
                        required: ["name", "price", "quantity"]
                    }
                },
                tax: { type: Type.NUMBER },
                tip: { type: Type.NUMBER }
            },
            required: ["items", "tax", "tip"]
        };

        const response = await ai.models.generateContent({
            model: 'gemma-4-26b-a4b-it',
            contents: [
                "Analyze this restaurant receipt image. Extract all individual line items, tax, and tip.",
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
            }
        });

        res.json({ success: true, data: JSON.parse(response.text) });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to process receipt image.' });
    }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

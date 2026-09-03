import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    console.log("Testing gemini-3.6-flash...");
    const res = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Hola',
    });
    console.log(res.text);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

test();

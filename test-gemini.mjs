import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    console.log("Testing gemini-2.5-flash...");
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hola',
    });
    console.log(res.text);
  } catch (e) {
    console.error("Error 2.5:", e.message);
  }
}

test();

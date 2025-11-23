import Gemini from "@google/generative-ai";

const genAI = new Gemini({
  apiKey: process.env.GEMINI_API_KEY
});

export default genAI;

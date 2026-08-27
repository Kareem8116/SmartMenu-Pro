const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Wait, listModels isn't exposed directly in GoogleGenerativeAI sometimes. Let's just try gemini-pro.
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent("Say hello");
    console.log(await result.response.text());
  } catch (e) {
    console.error(e);
  }
}
listModels();

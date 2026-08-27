require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the recommended model for general text tasks
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

/**
 * Helper to generate JSON response from Gemini
 */
async function generateJsonPrompt(systemPrompt, userPrompt) {
  try {
    const prompt = `${systemPrompt}\n\nUser Input: ${userPrompt}\n\nPlease respond with a valid JSON object ONLY, without markdown formatting.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting (```json ... ```)
    if (text.startsWith('```json')) text = text.slice(7);
    if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error('Error in Gemini generation:', error);
    console.warn('Returning mock data due to API failure.');
    
    // Fallback Mock Data based on prompt content
    if (systemPrompt.includes('Inventory Auditor')) {
      return { summary: "Mock Audit: Found minor discrepancies.", variances: [{ itemName: "Coffee Beans", diff: -2, reason: "Possible spill or unrecorded waste." }] };
    }
    if (systemPrompt.includes('Menu Engineer')) {
      return { recommendations: [{ itemName: "Iced Latte", suggestion: "Increase price by 10% due to high volume." }] };
    }
    if (systemPrompt.includes('Demand Forecaster')) {
      return { weatherContext: "Mock Weather Data", predictions: [{ category: "Cold Drinks", reason: "Hot weather expected", prepSuggestion: "Double ice prep" }] };
    }
    if (systemPrompt.includes('Anomaly Detector')) {
      return { anomaliesFound: true, alerts: [{ type: "High Refunds", description: "Cashier X refunded 5 orders", severity: "high" }] };
    }
    if (systemPrompt.includes('Upsell')) {
      return { suggestedItemCategory: "Pastries", pitchMessage: "How about a fresh croissant to go with that?" };
    }

    return {};
  }
}

/**
 * Generate plain text response (for chatbot or summaries)
 */
async function generateTextPrompt(systemPrompt, userPrompt) {
  try {
    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in Gemini text generation:', error);
    return "Hi there! I am currently operating in offline/demo mode, but I'm the SmartMenu AI Bot. How can I help you today?";
  }
}

module.exports = {
  model,
  generateJsonPrompt,
  generateTextPrompt
};

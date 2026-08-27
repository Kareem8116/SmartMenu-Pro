const express = require('express');
const { generateJsonPrompt, generateTextPrompt } = require('../services/ai');
const axios = require('axios');

const router = express.Router();

/**
 * 1. AI Inventory Audit
 * Receives theoretical stock and actual stock, returns variance analysis.
 */
router.post('/inventory-audit', async (req, res) => {
  try {
    const { items } = req.body;
    const systemPrompt = `You are a smart Cafe Inventory Auditor.
    You will receive a list of inventory items with 'theoreticalQty' and 'actualQty'.
    Analyze the variances. Group items by severity of variance.
    Suggest possible reasons for shortages (e.g., unrecorded waste, theft, recipe miscalculation).
    Return JSON format: { "summary": "...", "variances": [{ "itemName": "...", "diff": number, "reason": "..." }] }`;
    
    const response = await generateJsonPrompt(systemPrompt, JSON.stringify(items));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. AI Menu Engineering
 * Analyzes items by volume and margin.
 */
router.post('/menu-engineering', async (req, res) => {
  try {
    const { menuStats } = req.body; // array of { name, salesCount, profitMargin }
    const systemPrompt = `You are an expert Cafe Menu Engineer.
    Categorize items into: Stars (high vol, high profit), Plowhorses (high vol, low profit), Puzzles (low vol, high profit), Dogs (low vol, low profit).
    Provide a specific recommendation for each item (e.g., increase price, redesign menu placement).
    Return JSON: { "categories": { "stars": ["..."], "plowhorses": [...], ... }, "recommendations": [{ "itemName": "...", "suggestion": "..." }] }`;
    
    const response = await generateJsonPrompt(systemPrompt, JSON.stringify(menuStats));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. AI Demand Forecasting (Weather Aware)
 */
router.post('/demand-forecast', async (req, res) => {
  try {
    const { historicalData, city = 'Cairo' } = req.body;
    
    // Fetch Weather
    let weatherInfo = 'Weather data unavailable.';
    try {
      const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
      weatherInfo = `Current weather in ${city}: ${weatherRes.data.weather[0].description}, Temp: ${weatherRes.data.main.temp}C.`;
    } catch (e) {
      console.error('Weather API failed', e.message);
    }

    const systemPrompt = `You are a Cafe Demand Forecaster.
    Consider this weather: ${weatherInfo}
    And this historical sales data for similar days: ${JSON.stringify(historicalData)}.
    Predict which 3 categories/items will have the highest demand today and suggest prep quantities.
    Return JSON: { "weatherContext": "...", "predictions": [{ "category": "...", "reason": "...", "prepSuggestion": "..." }] }`;

    const response = await generateJsonPrompt(systemPrompt, "Predict today's demand.");
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. AI Anomaly Detection
 */
router.post('/anomaly-detect', async (req, res) => {
  try {
    const { recentTransactions } = req.body;
    const systemPrompt = `You are a Cafe Fraud & Anomaly Detector.
    Review these recent transactions. Look for unusual patterns:
    - High number of refunds/voids by a specific cashier.
    - Too many discounts applied to the same table.
    Return JSON: { "anomaliesFound": boolean, "alerts": [{ "type": "...", "description": "...", "severity": "high|medium|low" }] }`;

    const response = await generateJsonPrompt(systemPrompt, JSON.stringify(recentTransactions));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. QR Menu Chatbot
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, menuContext } = req.body;
    const systemPrompt = `You are a friendly, helpful waiter bot for SmartMenu Cafe.
    Answer customer questions based ONLY on this menu context: ${JSON.stringify(menuContext)}.
    If asked about something not on the menu, politely say we don't serve it.
    Keep answers short and friendly (max 2 sentences).`;

    const text = await generateTextPrompt(systemPrompt, message);
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. QR Menu Upsell
 */
router.post('/upsell', async (req, res) => {
  console.log("Upsell request received with body:", req.body);
  try {
    const { cartItems } = req.body;
    const systemPrompt = `You are a Cafe Upsell AI.
    The customer has these items in their cart: ${JSON.stringify(cartItems)}.
    Suggest ONE logical complementary item from a cafe menu (e.g., if they have coffee, suggest a croissant or water. If they have cake, suggest coffee).
    Return JSON: { "suggestedItemCategory": "...", "pitchMessage": "..." }`;

    const response = await generateJsonPrompt(systemPrompt, "Suggest an upsell.");
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

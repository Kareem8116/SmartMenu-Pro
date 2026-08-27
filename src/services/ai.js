// Service to communicate with the Local Hub AI endpoints

const getHubUrl = () => {
  const ip = localStorage.getItem('localHubIP') || 'localhost';
  return `http://${ip}:3001/api/ai`;
};

export const runInventoryAudit = async (items) => {
  const response = await fetch(`${getHubUrl()}/inventory-audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  return response.json();
};

export const runMenuEngineering = async (menuStats) => {
  const response = await fetch(`${getHubUrl()}/menu-engineering`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menuStats })
  });
  return response.json();
};

export const runDemandForecast = async (historicalData, city = 'Cairo') => {
  const response = await fetch(`${getHubUrl()}/demand-forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ historicalData, city })
  });
  return response.json();
};

export const runAnomalyDetection = async (recentTransactions) => {
  const response = await fetch(`${getHubUrl()}/anomaly-detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recentTransactions })
  });
  return response.json();
};

export const chatWithBot = async (message, menuContext) => {
  const response = await fetch(`${getHubUrl()}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, menuContext })
  });
  return response.json();
};

export const getUpsellSuggestion = async (cartItems) => {
  const response = await fetch(`${getHubUrl()}/upsell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems })
  });
  return response.json();
};

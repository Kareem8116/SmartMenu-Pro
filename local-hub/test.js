const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://127.0.0.1:3001/api/ai/upsell', {
      cartItems: ['Iced Latte']
    });
    console.log('AI Response:', res.data);
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}
test();

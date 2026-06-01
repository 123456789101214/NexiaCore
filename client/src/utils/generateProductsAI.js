const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export const generateProductsWithAI = async (businessType, category, count = 10) => {
    if (!GEMINI_API_KEY) return [];

    const prompt = `
You are a Sri Lankan retail business expert.
Generate ${count} realistic products for a ${businessType} store in Sri Lanka.
Category: ${category}

Requirements:
- Use real Sri Lankan brand names where applicable
- Prices in Sri Lankan Rupees (LKR) — realistic 2024-2025 prices
- buyingPrice should be 70-80% of selling price
- Include mix of fast-moving and slow-moving items

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "name": "Product Name",
    "barcode": "generate a realistic 13-digit EAN barcode",
    "category": "${category}",
    "buyingPrice": 150,
    "price": 200,
    "stock": 25,
    "unit": "pcs",
    "minStockLevel": 10
  }
]
`;
    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        const cleaned = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini AI generation failed:', error);
        return []; 
    }
};
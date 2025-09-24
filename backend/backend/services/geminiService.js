const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('⚠️  Gemini API key not configured. Image generation will use fallback.');
            this.genAI = null;
            return;
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async generateImageSearchTerms(recipe) {
        if (!this.genAI) {
            return this.getFallbackImageTerms(recipe);
        }

        try {
            const ingredients = recipe.ingredients ?
                recipe.ingredients.map(ing => ing.item || ing.name).join(', ') :
                'various ingredients';

            const prompt = `You are an expert food photographer. Analyze this recipe and generate the most specific, exact search term that would find a photograph of this EXACT dish.

Recipe: ${recipe.title}
Cuisine: ${recipe.cuisineType || 'general'}
Main Ingredients: ${ingredients}
Description: ${recipe.description || 'A delicious recipe'}

Return ONLY the most specific, single search term that represents this exact dish. Focus on the specific dish name, not generic categories.

Examples:
- For "Chicken Tikka Masala" → "chicken tikka masala"
- For "Beef Stroganoff" → "beef stroganoff"
- For "Shakshuka" → "shakshuka"
- For "Pad Thai" → "pad thai"
- For "Caesar Salad" → "caesar salad"

Return only the dish name, nothing else:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const searchTerms = response.text().trim();

            console.log(`🎨 Gemini generated image terms for "${recipe.title}": ${searchTerms}`);

            return {
                success: true,
                searchTerms: searchTerms,
                source: 'gemini'
            };

        } catch (error) {
            console.error('Gemini image generation error:', error);
            return this.getFallbackImageTerms(recipe);
        }
    }

    getFallbackImageTerms(recipe) {
        const title = recipe.title || 'food dish';
        const cuisine = recipe.cuisineType || '';

        // Create basic search terms as fallback
        const fallbackTerms = [
            title.toLowerCase(),
            cuisine ? `${cuisine} food` : 'prepared meal',
            'plated dish'
        ].filter(term => term).join(', ');

        return {
            success: true,
            searchTerms: fallbackTerms,
            source: 'fallback'
        };
    }

    isConfigured() {
        return this.genAI !== null;
    }
}

module.exports = new GeminiService();
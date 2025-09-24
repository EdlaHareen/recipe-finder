const OpenAI = require('openai');
const geminiService = require('./geminiService');

class OpenAIService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️  OpenAI API key not configured. AI features will not work.');
            this.client = null;
            return;
        }

        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.visionModel = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
        this.maxTokens = parseInt(process.env.MAX_TOKENS) || 4000;
        this.temperature = parseFloat(process.env.TEMPERATURE) || 0.7;
    }

    async generateRecipes(ingredients, options = {}) {
        if (!this.client) {
            throw new Error('OpenAI API not configured');
        }

        try {
            const {
                count = 3, // Reduced from 5 to avoid truncation
                dietaryRestrictions = [],
                cuisineType = '',
                difficulty = '',
                cookingTime = '',
                servings = 4
            } = options;

            const systemPrompt = `You are a professional chef and recipe developer. Create detailed, practical recipes based on the provided ingredients. Always respond with valid JSON format.`;

            const userPrompt = `Create ${count} recipes using these available ingredients: ${ingredients.join(', ')}.

${dietaryRestrictions.length > 0 ? `Must be: ${dietaryRestrictions.join(', ')}. ` : ''}${cuisineType ? `Cuisine: ${cuisineType}. ` : ''}

IMPORTANT: Mark "have": true only for ingredients from this list: [${ingredients.join(', ')}]. Mark "have": false for any additional ingredients needed.

JSON format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "cookingTime": 30,
      "servings": ${servings},
      "difficulty": "easy",
      "cuisineType": "type",
      "ingredients": [
        {"item": "rice", "amount": "1 cup", "have": true},
        {"item": "salt", "amount": "1 tsp", "have": false}
      ],
      "instructions": [
        "Step 1", "Step 2"
      ]
    }
  ]
}

Be accurate about which ingredients the user has vs needs to buy.`;

            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                response_format: { type: "json_object" }
            });

            let response = completion.choices[0].message.content;

            // Clean up the response to fix common JSON issues
            response = response.trim();

            // Remove any markdown code block formatting
            if (response.startsWith('```json')) {
                response = response.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }
            if (response.startsWith('```')) {
                response = response.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Try to parse JSON with error handling
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response);
            } catch (parseError) {
                console.error('JSON Parse Error. Raw response length:', response.length);
                console.error('Parse error:', parseError.message);

                // Try to fix common JSON issues and parse again
                let fixedResponse = response
                    .replace(/,\s*}/g, '}')  // Remove trailing commas
                    .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
                    .replace(/\n/g, ' ')     // Replace newlines with spaces
                    .replace(/\t/g, ' ')     // Replace tabs with spaces
                    .replace(/\s+/g, ' ');   // Normalize whitespace

                try {
                    parsedResponse = JSON.parse(fixedResponse);
                    console.log('✅ Fixed JSON parsing successfully');
                } catch (secondError) {
                    console.error('Failed to fix JSON. Second error:', secondError.message);
                    throw new Error('OpenAI returned invalid JSON format');
                }
            }

            // Add generated timestamps and IDs
            parsedResponse.recipes = parsedResponse.recipes.map((recipe, index) => ({
                ...recipe,
                id: `ai_${Date.now()}_${index}`,
                generatedAt: new Date().toISOString(),
                aiGenerated: true
            }));

            // Generate intelligent image URLs using Gemini
            for (let recipe of parsedResponse.recipes) {
                try {
                    const imageResult = await geminiService.generateImageSearchTerms(recipe);
                    if (imageResult.success) {
                        // Comprehensive database of exact dish images
                        const exactDishImages = {
                            // Egg dishes
                            'scrambled eggs': 'https://images.unsplash.com/photo-1582169296591-183e8f02de1b?w=400&h=300&fit=crop',
                            'shakshuka': 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop',
                            'omelette': 'https://images.unsplash.com/photo-1586191718475-c7a0e7c3af4f?w=400&h=300&fit=crop',
                            'frittata': 'https://images.unsplash.com/photo-1586191718475-c7a0e7c3af4f?w=400&h=300&fit=crop',
                            'egg salad': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
                            'deviled eggs': 'https://images.unsplash.com/photo-1582169296591-183e8f02de1b?w=400&h=300&fit=crop',
                            'egg drop soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',

                            // Pasta dishes
                            'spaghetti carbonara': 'https://images.unsplash.com/photo-1608219992759-8d74ed8db1f0?w=400&h=300&fit=crop',
                            'spaghetti bolognese': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
                            'fettuccine alfredo': 'https://images.unsplash.com/photo-1572441713132-51c75654db73?w=400&h=300&fit=crop',
                            'pasta': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop',
                            'spaghetti': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
                            'macaroni and cheese': 'https://images.unsplash.com/photo-1608219992759-8d74ed8db1f0?w=400&h=300&fit=crop',

                            // Rice dishes
                            'fried rice': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
                            'rice stir fry': 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400&h=300&fit=crop',
                            'chicken fried rice': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
                            'vegetable fried rice': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',

                            // Stir fry dishes
                            'stir fry': 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400&h=300&fit=crop',
                            'vegetable stir fry': 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400&h=300&fit=crop',
                            'chicken stir fry': 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400&h=300&fit=crop',

                            // Salads
                            'caesar salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
                            'garden salad': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
                            'greek salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
                            'salad': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',

                            // Soups
                            'chicken soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',
                            'tomato soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',
                            'vegetable soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',
                            'soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',

                            // Other popular dishes
                            'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
                            'burger': 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop',
                            'sandwich': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop',
                            'chicken curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
                            'beef curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
                            'curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
                            'grilled chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
                            'fried chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
                            'roasted chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop'
                        };

                        // Use Gemini's exact dish name to find matching image
                        const dishName = imageResult.searchTerms.trim().toLowerCase();
                        let selectedImage = null;

                        // First try exact match
                        if (exactDishImages[dishName]) {
                            selectedImage = exactDishImages[dishName];
                            console.log(`🎯 Found exact dish match for "${dishName}"`);
                        } else {
                            // Try partial matching for dish names
                            for (const [dish, imageUrl] of Object.entries(exactDishImages)) {
                                if (dishName.includes(dish) || dish.includes(dishName)) {
                                    selectedImage = imageUrl;
                                    console.log(`🎯 Found partial dish match: "${dishName}" matches "${dish}"`);
                                    break;
                                }
                            }
                        }

                        // Fallback to generic food image
                        if (!selectedImage) {
                            selectedImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                            console.log(`🔄 Using fallback image for unmatched dish: "${dishName}"`);
                        }

                        recipe.image = selectedImage;
                        console.log(`🖼️  Generated image for "${recipe.title}" using dish "${dishName}": ${recipe.image}`);
                    }
                } catch (error) {
                    console.error(`Image generation failed for recipe ${recipe.title}:`, error);
                    // Will fall back to frontend image selection
                }
            }

            return {
                success: true,
                data: parsedResponse.recipes,
                metadata: {
                    ingredientsUsed: ingredients,
                    generatedAt: new Date().toISOString(),
                    model: this.model,
                    requestOptions: options
                }
            };

        } catch (error) {
            console.error('OpenAI Recipe Generation Error:', error);

            if (error.status === 401) {
                throw new Error('OpenAI API key is invalid');
            } else if (error.status === 429) {
                throw new Error('OpenAI API rate limit exceeded. Please try again later.');
            } else if (error.status === 500) {
                throw new Error('OpenAI service is currently unavailable');
            }

            throw new Error(`Recipe generation failed: ${error.message}`);
        }
    }

    async analyzeIngredientImage(imageBase64) {
        if (!this.client) {
            throw new Error('OpenAI API not configured');
        }

        try {
            const completion = await this.client.chat.completions.create({
                model: this.visionModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analyze this image and identify all food ingredients visible. Return a JSON response with the following format:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "confidence": 0.95,
      "category": "vegetable|fruit|protein|grain|dairy|spice|other"
    }
  ],
  "analysis": "Brief description of what you see"
}

Only identify clear, recognizable food ingredients. Be conservative with confidence scores.`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0].message.content;
            const parsedResponse = JSON.parse(response);

            return {
                success: true,
                data: parsedResponse,
                metadata: {
                    analyzedAt: new Date().toISOString(),
                    model: this.visionModel
                }
            };

        } catch (error) {
            console.error('OpenAI Image Analysis Error:', error);

            if (error.status === 401) {
                throw new Error('OpenAI API key is invalid');
            } else if (error.status === 429) {
                throw new Error('OpenAI API rate limit exceeded. Please try again later.');
            }

            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    async suggestRecipeImprovements(recipeData, userFeedback) {
        if (!this.client) {
            throw new Error('OpenAI API not configured');
        }

        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional chef helping improve recipes based on user feedback.'
                    },
                    {
                        role: 'user',
                        content: `Improve this recipe based on user feedback:

Recipe: ${JSON.stringify(recipeData, null, 2)}

User Feedback: ${userFeedback}

Provide specific suggestions for improvements in JSON format:
{
  "improvements": [
    {
      "category": "ingredients|instructions|timing|technique",
      "suggestion": "specific improvement suggestion",
      "reason": "why this improvement helps"
    }
  ],
  "modifiedRecipe": {
    // Updated recipe with improvements applied
  }
}`
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0].message.content;
            return {
                success: true,
                data: JSON.parse(response)
            };

        } catch (error) {
            console.error('OpenAI Recipe Improvement Error:', error);
            throw new Error(`Recipe improvement failed: ${error.message}`);
        }
    }

    isConfigured() {
        return this.client !== null;
    }
}

module.exports = new OpenAIService();
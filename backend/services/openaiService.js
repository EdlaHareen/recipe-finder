const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
                count = 5,
                dietaryRestrictions = [],
                cuisineType = '',
                difficulty = '',
                cookingTime = '',
                servings = 4
            } = options;

            const systemPrompt = `You are a professional chef and recipe developer. Create detailed, practical recipes based on the provided ingredients. Always respond with valid JSON format.`;

            const actualCount = Math.min(count, 3); // Limit to 3 recipes to avoid truncation
            const userPrompt = `
Create ${actualCount} unique and delicious recipes using these ingredients: ${ingredients.join(', ')}.

Requirements:
- Each recipe should be realistic and cookable
- Include ingredients you have vs. missing ingredients
- Provide step-by-step instructions (4-6 steps max)
- Include cooking time, servings, and difficulty level
- Keep descriptions concise
${dietaryRestrictions.length > 0 ? `- Must be suitable for: ${dietaryRestrictions.join(', ')}` : ''}
${cuisineType ? `- Cuisine type: ${cuisineType}` : ''}
${difficulty ? `- Difficulty level: ${difficulty}` : ''}
${cookingTime ? `- Maximum cooking time: ${cookingTime} minutes` : ''}

Response format (JSON):
{
  "recipes": [
    {
      "id": "unique_id",
      "title": "Recipe Name",
      "description": "Brief description",
      "cookingTime": 30,
      "servings": ${servings},
      "difficulty": "easy|medium|hard",
      "cuisineType": "cuisine type",
      "dietaryTags": ["vegetarian", "gluten-free", etc.],
      "ingredients": [
        {
          "item": "ingredient name",
          "amount": "quantity",
          "have": true/false
        }
      ],
      "instructions": [
        "Step 1 description",
        "Step 2 description"
      ],
      "tips": "Optional cooking tips",
      "nutritionInfo": {
        "calories": "approximate calories",
        "protein": "protein content",
        "carbs": "carb content"
      }
    }
  ]
}`;

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

            const response = completion.choices[0].message.content;
            console.log('✅ OpenAI response received, length:', response ? response.length : 'null/undefined');

            if (!response || response.trim().length === 0) {
                throw new Error('OpenAI returned empty response');
            }

            // Check if response appears to be truncated
            let responseToUse = response;
            if (!response.trim().endsWith('}') && !response.trim().endsWith(']}')) {
                console.warn('Response appears truncated, attempting to fix...');
                // Try to fix common truncation issues
                let fixedResponse = response.trim();

                // Add missing closing quotes and braces
                const openBraces = (fixedResponse.match(/{/g) || []).length;
                const closeBraces = (fixedResponse.match(/}/g) || []).length;
                const openBrackets = (fixedResponse.match(/\[/g) || []).length;
                const closeBrackets = (fixedResponse.match(/]/g) || []).length;

                // Add missing closing characters
                for (let i = closeBrackets; i < openBrackets; i++) {
                    fixedResponse += ']';
                }
                for (let i = closeBraces; i < openBraces; i++) {
                    fixedResponse += '}';
                }

                console.log('Attempting to parse fixed response...');
                try {
                    JSON.parse(fixedResponse);
                    responseToUse = fixedResponse;
                    console.log('Successfully fixed truncated response');
                } catch (fixError) {
                    console.error('Failed to fix truncated response:', fixError.message);
                    throw new Error('OpenAI response was truncated and could not be fixed. Try using fewer recipes or shorter descriptions.');
                }
            }

            const parsedResponse = JSON.parse(responseToUse);

            // Add generated timestamps and IDs
            parsedResponse.recipes = parsedResponse.recipes.map((recipe, index) => ({
                ...recipe,
                id: `ai_${Date.now()}_${index}`,
                generatedAt: new Date().toISOString(),
                aiGenerated: true
            }));

            // Generate images for each recipe (in parallel)
            console.log('🖼️ Starting image generation for recipes...');
            const imagePromises = parsedResponse.recipes.map(async (recipe) => {
                try {
                    const imageResult = await this.generateRecipeImage(recipe.title, ingredients);
                    if (imageResult.success) {
                        recipe.imageUrl = imageResult.data.imageUrl;
                        recipe.imageGenerated = true;
                    }
                } catch (error) {
                    console.warn(`Failed to generate image for ${recipe.title}:`, error.message);
                    // Continue without image - don't fail the whole process
                }
                return recipe;
            });

            // Wait for all images to be generated (or fail gracefully)
            parsedResponse.recipes = await Promise.all(imagePromises);
            console.log('✅ Image generation completed');

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

    async generateRecipeImage(recipeTitle, ingredients) {
        if (!this.client) {
            throw new Error('OpenAI API not configured');
        }

        try {
            // Create a descriptive prompt for DALL-E 3
            const prompt = `A beautiful, professional food photography shot of ${recipeTitle}, featuring ${ingredients.slice(0, 3).join(', ')}. The dish should look appetizing, well-plated, and restaurant-quality. Bright, natural lighting, clean white background, top-down view, highly detailed, photorealistic.`;

            console.log(`🖼️ Generating image for: ${recipeTitle}`);

            const response = await this.client.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "natural"
            });

            const dalleImageUrl = response.data[0].url;
            console.log(`📥 DALL-E image generated: ${dalleImageUrl}`);

            // Download and store the image locally
            const localImageUrl = await this.downloadAndStoreImage(dalleImageUrl, recipeTitle);

            return {
                success: true,
                data: {
                    imageUrl: localImageUrl,
                    dalleUrl: dalleImageUrl, // Keep original for reference
                    prompt: prompt,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('OpenAI Image Generation Error:', error);

            if (error.status === 401) {
                throw new Error('OpenAI API key is invalid');
            } else if (error.status === 429) {
                throw new Error('OpenAI API rate limit exceeded. Please try again later.');
            } else if (error.status === 500) {
                throw new Error('OpenAI image service is currently unavailable');
            }

            // Don't fail the whole recipe generation if image generation fails
            console.warn('Image generation failed, continuing without image');
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }

    async downloadAndStoreImage(dalleImageUrl, recipeTitle) {
        try {
            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Generate a unique filename
            const timestamp = Date.now();
            const sanitizedTitle = recipeTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
            const filename = `recipe_${sanitizedTitle}_${timestamp}.png`;
            const filepath = path.join(uploadsDir, filename);

            // Download the image from DALL-E
            console.log(`📥 Downloading image from DALL-E: ${dalleImageUrl}`);
            const imageResponse = await axios.get(dalleImageUrl, {
                responseType: 'stream',
                timeout: 30000 // 30 second timeout
            });

            // Save the image to local storage
            const writer = fs.createWriteStream(filepath);
            imageResponse.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✅ Image saved locally: ${filename}`);
                    resolve(`/uploads/${filename}`);
                });
                writer.on('error', (error) => {
                    console.error('❌ Error saving image:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('❌ Error downloading/storing image:', error);
            // Return a fallback placeholder URL
            return `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(recipeTitle.substring(0, 20))}`;
        }
    }

    isConfigured() {
        return this.client !== null;
    }
}

module.exports = new OpenAIService();
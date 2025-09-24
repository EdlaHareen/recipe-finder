const express = require('express');
const openaiService = require('../services/openaiService');
const { getDatabase } = require('../utils/database');
const router = express.Router();

// Generate recipes based on ingredients using AI
router.post('/generate', async (req, res) => {
    try {
        const {
            ingredients,
            count = 5,
            dietaryRestrictions = [],
            cuisineType = '',
            difficulty = '',
            cookingTime = '',
            servings = 4
        } = req.body;

        // Validation
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Ingredients array is required and must not be empty'
            });
        }

        if (ingredients.length > 20) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 20 ingredients allowed'
            });
        }

        // Clean ingredients
        const cleanIngredients = ingredients
            .map(ing => ing.trim().toLowerCase())
            .filter(ing => ing.length > 0);

        if (cleanIngredients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one valid ingredient is required'
            });
        }

        // Check if OpenAI is configured
        if (!openaiService.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'AI service is not configured. Please check server configuration.'
            });
        }

        // Generate recipes using OpenAI
        const result = await openaiService.generateRecipes(cleanIngredients, {
            count: Math.min(count, 10), // Limit to 10 recipes max
            dietaryRestrictions,
            cuisineType,
            difficulty,
            cookingTime,
            servings
        });

        // Store search in database
        const db = getDatabase();
        const userSession = req.headers['x-session-id'] || `anonymous_${Date.now()}`;

        db.run(`
            INSERT INTO search_history (user_session, ingredients, results_count)
            VALUES (?, ?, ?)
        `, [userSession, JSON.stringify(cleanIngredients), result.data.length]);

        // Store generated recipes in database
        const insertPromises = result.data.map(recipe => {
            return new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO recipes (
                        title, description, ingredients, instructions,
                        cooking_time, servings, difficulty, cuisine_type,
                        dietary_tags
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    recipe.title,
                    recipe.description,
                    JSON.stringify(recipe.ingredients),
                    JSON.stringify(recipe.instructions),
                    recipe.cookingTime,
                    recipe.servings,
                    recipe.difficulty,
                    recipe.cuisineType,
                    JSON.stringify(recipe.dietaryTags || [])
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ ...recipe, dbId: this.lastID });
                    }
                });
            });
        });

        try {
            const savedRecipes = await Promise.all(insertPromises);
            result.data = savedRecipes;
        } catch (dbError) {
            console.warn('Failed to save recipes to database:', dbError);
            // Continue without saving to DB
        }

        res.json(result);

    } catch (error) {
        console.error('Recipe generation error:', error);

        if (error.message.includes('rate limit')) {
            return res.status(429).json({
                success: false,
                error: 'AI service rate limit exceeded. Please try again in a few minutes.'
            });
        }

        if (error.message.includes('API key')) {
            return res.status(503).json({
                success: false,
                error: 'AI service configuration error'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to generate recipes. Please try again.'
        });
    }
});

// Get saved recipes
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            cuisine,
            difficulty,
            maxCookingTime,
            dietaryTags
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const db = getDatabase();

        let query = 'SELECT * FROM recipes WHERE 1=1';
        const params = [];

        // Add filters
        if (cuisine) {
            query += ' AND cuisine_type = ?';
            params.push(cuisine);
        }

        if (difficulty) {
            query += ' AND difficulty = ?';
            params.push(difficulty);
        }

        if (maxCookingTime) {
            query += ' AND cooking_time <= ?';
            params.push(parseInt(maxCookingTime));
        }

        if (dietaryTags) {
            // Simple search in JSON array - in production, consider using a proper JSON query
            query += ' AND dietary_tags LIKE ?';
            params.push(`%${dietaryTags}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch recipes'
                });
            }

            // Parse JSON fields
            const recipes = rows.map(row => ({
                ...row,
                ingredients: JSON.parse(row.ingredients || '[]'),
                instructions: JSON.parse(row.instructions || '[]'),
                dietary_tags: JSON.parse(row.dietary_tags || '[]')
            }));

            res.json({
                success: true,
                data: recipes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: recipes.length === parseInt(limit)
                }
            });
        });

    } catch (error) {
        console.error('Get recipes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recipes'
        });
    }
});

// Get recipe by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch recipe'
                });
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    error: 'Recipe not found'
                });
            }

            // Parse JSON fields
            const recipe = {
                ...row,
                ingredients: JSON.parse(row.ingredients || '[]'),
                instructions: JSON.parse(row.instructions || '[]'),
                dietary_tags: JSON.parse(row.dietary_tags || '[]')
            };

            res.json({
                success: true,
                data: recipe
            });
        });

    } catch (error) {
        console.error('Get recipe error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recipe'
        });
    }
});

// Add recipe to favorites
router.post('/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const userSession = req.headers['x-session-id'] || `anonymous_${Date.now()}`;
        const db = getDatabase();

        db.run(`
            INSERT OR IGNORE INTO favorites (user_session, recipe_id)
            VALUES (?, ?)
        `, [userSession, id], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to add to favorites'
                });
            }

            res.json({
                success: true,
                message: 'Recipe added to favorites',
                favorited: this.changes > 0
            });
        });

    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add to favorites'
        });
    }
});

// Remove recipe from favorites
router.delete('/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const userSession = req.headers['x-session-id'] || `anonymous_${Date.now()}`;
        const db = getDatabase();

        db.run(`
            DELETE FROM favorites WHERE user_session = ? AND recipe_id = ?
        `, [userSession, id], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to remove from favorites'
                });
            }

            res.json({
                success: true,
                message: 'Recipe removed from favorites',
                removed: this.changes > 0
            });
        });

    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove from favorites'
        });
    }
});

// Get user's favorite recipes
router.get('/user/favorites', async (req, res) => {
    try {
        const userSession = req.headers['x-session-id'] || '';
        const db = getDatabase();

        if (!userSession) {
            return res.json({
                success: true,
                data: []
            });
        }

        db.all(`
            SELECT r.* FROM recipes r
            INNER JOIN favorites f ON r.id = f.recipe_id
            WHERE f.user_session = ?
            ORDER BY f.created_at DESC
        `, [userSession], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch favorites'
                });
            }

            // Parse JSON fields
            const recipes = rows.map(row => ({
                ...row,
                ingredients: JSON.parse(row.ingredients || '[]'),
                instructions: JSON.parse(row.instructions || '[]'),
                dietary_tags: JSON.parse(row.dietary_tags || '[]')
            }));

            res.json({
                success: true,
                data: recipes
            });
        });

    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch favorites'
        });
    }
});

module.exports = router;
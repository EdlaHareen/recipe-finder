const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const openaiService = require('../services/openaiService');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,webp').split(',');
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024, // 5MB default
        files: 1
    }
});

// Analyze ingredient image using AI
router.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // Check if OpenAI is configured
        if (!openaiService.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'AI service is not configured. Please check server configuration.'
            });
        }

        // Process image with Sharp
        const processedImage = await sharp(req.file.buffer)
            .resize(1024, 1024, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: 85,
                progressive: true
            })
            .toBuffer();

        // Convert to base64 for OpenAI Vision API
        const base64Image = processedImage.toString('base64');

        // Analyze image with OpenAI Vision
        const analysisResult = await openaiService.analyzeIngredientImage(base64Image);

        // Save analyzed image (optional)
        const filename = `analyzed_${Date.now()}.jpg`;
        const filepath = path.join(process.cwd(), 'uploads', filename);

        try {
            await fs.promises.writeFile(filepath, processedImage);
            analysisResult.data.imageUrl = `/uploads/${filename}`;
        } catch (saveError) {
            console.warn('Failed to save analyzed image:', saveError);
            // Continue without saving image
        }

        res.json(analysisResult);

    } catch (error) {
        console.error('Image analysis error:', error);

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

        if (error.message.includes('File type')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to analyze image. Please try again.'
        });
    }
});

// Upload recipe image
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // Process and optimize image
        const processedImage = await sharp(req.file.buffer)
            .resize(800, 600, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({
                quality: 85,
                progressive: true
            })
            .toBuffer();

        // Save image
        const filename = `recipe_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filepath = path.join(process.cwd(), 'uploads', filename);

        await fs.promises.writeFile(filepath, processedImage);

        res.json({
            success: true,
            data: {
                filename,
                url: `/uploads/${filename}`,
                size: processedImage.length,
                originalName: req.file.originalname
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image. Please try again.'
        });
    }
});

// Proxy DALL-E images with proper authentication
router.get('/proxy/*', async (req, res) => {
    try {
        // Get the full path after /proxy/
        const imagePath = req.params[0];
        
        if (!imagePath) {
            return res.status(400).json({
                success: false,
                error: 'No image path provided'
            });
        }

        // Construct the full DALL-E image URL
        const dalleImageUrl = `https://oaidalleapiprodscus.blob.core.windows.net/private/${imagePath}`;
        
        console.log('🖼️ Proxying DALL-E image:', dalleImageUrl);
        
        // Fetch the image with proper headers
        const response = await axios.get(dalleImageUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RecipeFinder/1.0)',
                'Accept': 'image/*'
            },
            timeout: 10000 // 10 second timeout
        });

        // Set appropriate headers for the response
        res.set({
            'Content-Type': response.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'Content-Length': response.headers['content-length']
        });

        // Pipe the image data to the response
        response.data.pipe(res);

    } catch (error) {
        console.error('Image proxy error:', error);
        
        if (error.response?.status === 403) {
            return res.status(404).json({
                success: false,
                error: 'Image not found or access denied'
            });
        }
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to load image'
        });
    }
});

// Get image processing capabilities
router.get('/capabilities', (req, res) => {
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024;
    const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,webp').split(',');

    res.json({
        success: true,
        data: {
            maxFileSize: maxSize,
            maxFileSizeMB: Math.round(maxSize / (1024 * 1024)),
            allowedTypes,
            aiAnalysisAvailable: openaiService.isConfigured(),
            supportedFeatures: [
                'ingredient_recognition',
                'image_optimization',
                'format_conversion',
                'resize_and_crop',
                'dalle_image_proxy'
            ]
        }
    });
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            const maxSizeMB = Math.round(
                (parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024) / (1024 * 1024)
            );
            return res.status(400).json({
                success: false,
                error: `File too large. Maximum size is ${maxSizeMB}MB`
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files. Only one file allowed per request'
            });
        }

        return res.status(400).json({
            success: false,
            error: `Upload error: ${error.message}`
        });
    }

    if (error.message.includes('File type not allowed')) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    next(error);
});

module.exports = router;
# 🍳 AI-Powered Recipe Finder

A modern full-stack web application that uses **AI** to generate personalized recipes based on ingredients you have at home. Features real **image recognition** and **intelligent recipe generation** powered by OpenAI.

## ✨ Features

### 🤖 **AI-Powered Core**
- **OpenAI GPT-4** recipe generation based on your ingredients
- **OpenAI Vision** for real ingredient recognition from photos
- **Intelligent matching** of ingredients with high-confidence detection
- **Personalized recommendations** based on dietary preferences

### 🍳 **Smart Recipe Generation**
- Generate 5+ unique recipes from your ingredients
- Specify dietary restrictions (vegetarian, vegan, gluten-free, etc.)
- Choose cuisine types (Italian, Asian, Mexican, etc.)
- Set difficulty levels and cooking time preferences
- Get detailed nutrition information

### 📱 **Modern User Experience**
- **Responsive design** that works on all devices
- **Real-time ingredient management** with visual tags
- **Image upload** with AI-powered ingredient detection
- **Detailed recipe modals** with step-by-step instructions
- **Favorites system** to save your preferred recipes

### 🚀 **Full-Stack Architecture**
- **Node.js + Express** backend with SQLite database
- **Vanilla JavaScript** frontend (no framework dependencies)
- **RESTful API** design with proper error handling
- **Rate limiting** and security middleware
- **Graceful fallback** when AI services are unavailable

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** 16.0.0 or higher
- **OpenAI API Key** (get one at [OpenAI Platform](https://platform.openai.com/))

### 1. **Install Dependencies**
```bash
cd backend
npm install
```

### 2. **Environment Configuration**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required Environment Variables:**
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. **Start the Backend Server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 4. **Open the Frontend**
```bash
# From the main directory
open index.html
```

## 🧪 **How to Use**

### **Basic Workflow:**
1. **Add Ingredients**: Type ingredients manually or upload photos
2. **AI Analysis**: Let OpenAI Vision identify ingredients from images
3. **Generate Recipes**: AI creates personalized recipes for you
4. **View Details**: Click recipes to see full instructions and ingredient lists
5. **Save Favorites**: Keep your preferred recipes for later

### **Advanced Features:**
- **Dietary Preferences**: Set vegetarian, vegan, keto, etc.
- **Cuisine Selection**: Focus on specific cuisine types
- **Cooking Time**: Specify maximum preparation time
- **Difficulty Level**: Choose easy, medium, or hard recipes

## 🔧 **API Endpoints**

### **Recipes**
- `POST /api/recipes/generate` - Generate AI recipes from ingredients
- `GET /api/recipes` - Get saved recipes with filtering
- `GET /api/recipes/:id` - Get specific recipe details
- `POST /api/recipes/:id/favorite` - Add recipe to favorites

### **Images**
- `POST /api/images/analyze` - AI-powered ingredient recognition
- `POST /api/images/upload` - Upload recipe images
- `GET /api/images/capabilities` - Get image processing info

### **Health**
- `GET /health` - Backend health check

## 🤖 **AI Configuration**

The app uses **OpenAI's latest models**:
- **GPT-4o-mini** for recipe generation (fast and cost-effective)
- **GPT-4o** for image analysis (high accuracy)

### **AI Features:**
- **Recipe Generation**: Creates unique, detailed recipes
- **Image Recognition**: Identifies ingredients with confidence scores
- **Contextual Understanding**: Considers dietary restrictions and preferences
- **Quality Control**: Validates recipes for feasibility

## 🔒 **Security Features**

- **Rate limiting** to prevent API abuse
- **Input validation** and sanitization
- **XSS protection** with HTML escaping
- **CORS configuration** for secure frontend-backend communication
- **Error handling** that doesn't expose sensitive information

## 📊 **Database Schema**

**SQLite database** with these tables:
- `recipes` - Generated and saved recipes
- `favorites` - User favorite recipes
- `search_history` - Track ingredient searches
- `ratings` - Recipe ratings and reviews

## 🎛️ **Configuration Options**

### **Recipe Generation**
```javascript
{
  count: 5,              // Number of recipes to generate
  dietaryRestrictions: ["vegetarian", "gluten-free"],
  cuisineType: "italian",
  difficulty: "easy",
  cookingTime: 30,       // Maximum minutes
  servings: 4
}
```

### **Image Processing**
- **Max file size**: 5MB
- **Supported formats**: JPG, PNG, WebP
- **AI confidence threshold**: 50%
- **Max ingredients per image**: 3

## 🚨 **Troubleshooting**

### **Backend Issues**
```bash
# Check if server is running
curl http://localhost:3001/health

# View server logs
npm run dev
```

### **OpenAI API Issues**
- Verify your API key in `.env`
- Check your OpenAI account balance
- Monitor rate limits in the console

### **Frontend Issues**
- Check browser console for JavaScript errors
- Verify backend connection status
- Try refreshing the page

## 🔄 **Fallback Mode**

When the backend is unavailable, the app automatically switches to **fallback mode**:
- Simple ingredient recognition based on filenames
- Basic recipe suggestions using templates
- Local storage for favorites
- Graceful degradation of AI features

## 📈 **Performance**

- **Fast AI responses** using GPT-4o-mini
- **Optimized images** with Sharp processing
- **Efficient caching** with proper headers
- **Minimal frontend bundle** (no heavy frameworks)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

---

## 🎉 **Ready to Cook!**

With **AI-powered recipe generation** and **real image recognition**, this Recipe Finder makes cooking more intelligent and fun. Simply add your ingredients and let AI create amazing recipes for you!

**Happy Cooking!** 🍳✨

# Technical Specifications Document
## Recipe Finder - AI-Powered Recipe Generation Platform

### 1. Development Environment

#### 1.1 System Requirements
- **Node.js:** v18.0.0 or higher
- **npm:** v8.0.0 or higher
- **Git:** v2.30.0 or higher
- **Operating System:** macOS, Linux, or Windows

#### 1.2 Development Tools
- **Code Editor:** Cursor IDE (recommended) or VS Code
- **Browser:** Chrome, Firefox, Safari, or Edge (latest versions)
- **Terminal:** Built-in terminal or iTerm2 (macOS)

#### 1.3 Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd recipe-finder

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (if any)
cd ..
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### 2. Technology Stack

#### 2.1 Frontend Technologies
```javascript
// Core Technologies
- HTML5: Semantic markup and accessibility
- CSS3: Responsive design and animations
- Vanilla JavaScript (ES6+): No framework dependencies
- Local Storage API: Client-side data persistence

// Key Libraries
- No external dependencies (vanilla approach)
- CSS Grid and Flexbox for layouts
- CSS Custom Properties for theming
- Fetch API for HTTP requests
```

#### 2.2 Backend Technologies
```javascript
// Core Framework
- Node.js: JavaScript runtime
- Express.js: Web application framework
- CORS: Cross-origin resource sharing
- Helmet: Security middleware

// Authentication & Security
- jsonwebtoken: JWT token generation
- bcrypt: Password hashing
- express-rate-limit: API rate limiting

// Database & Storage
- @supabase/supabase-js: Supabase client
- sqlite3: Local development database
- dotenv: Environment variable management
```

#### 2.3 External Services
```javascript
// AI Services
- OpenAI API: GPT-4o-mini for recipe generation
- OpenAI DALL-E 3: Recipe image generation
- OpenAI GPT-4o Vision: Image analysis

// Database Services
- Supabase: PostgreSQL database with real-time features
- Supabase Auth: User authentication service
```

### 3. Project Structure

```
recipe-finder/
├── docs/                           # Documentation
│   ├── product_requirement_docs.md
│   ├── architecture.md
│   └── technical.md
├── tasks/                          # Task Management
│   ├── tasks_plan.md
│   └── active_context.md
├── .cursor/                        # Cursor IDE Rules
│   └── rules/
│       ├── rules.mdc
│       ├── plan.mdc
│       ├── implement.mdc
│       ├── debug.mdc
│       ├── memory.mdc
│       └── directory-structure.mdc
├── backend/                        # Backend Application
│   ├── server.js                   # Main server file
│   ├── routes/                     # API routes
│   │   ├── auth.js
│   │   ├── recipes.js
│   │   ├── savedRecipes.js
│   │   └── images.js
│   ├── services/                   # Business logic
│   │   ├── openaiService.js
│   │   └── supabaseClient.js
│   ├── middleware/                 # Express middleware
│   │   └── errorMiddleware.js
│   ├── utils/                      # Utility functions
│   │   └── database.js
│   └── package.json
├── assets/                         # Frontend Assets
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── auth.js
│       ├── config.js
│       ├── landing.js
│       ├── myRecipes.js
│       └── savedRecipes.js
├── index.html                      # Landing page
├── pantry.html                     # Main application
├── my-recipes.html                 # User recipes
└── README.md
```

### 4. API Specifications

#### 4.1 Authentication Endpoints
```javascript
// POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "securePassword",
  "full_name": "John Doe"
}

// POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword"
}

// Response
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

#### 4.2 Recipe Generation Endpoints
```javascript
// POST /api/recipes/generate
{
  "ingredients": ["chicken", "rice", "vegetables"],
  "count": 5,
  "dietary_restrictions": ["gluten-free"],
  "cuisine_type": "italian"
}

// Response
{
  "success": true,
  "data": [
    {
      "title": "Chicken Rice Bowl",
      "ingredients": [...],
      "instructions": [...],
      "prep_time": 15,
      "cook_time": 30,
      "difficulty": "easy",
      "image_url": "generated_image_url",
      "aiGenerated": true
    }
  ]
}
```

#### 4.3 Saved Recipes Endpoints
```javascript
// POST /api/saved-recipes/save
{
  "recipe": {
    "title": "Recipe Title",
    "ingredients": [...],
    "instructions": [...],
    // ... complete recipe object
  }
}

// GET /api/saved-recipes/my-recipes?page=1&limit=10
// Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 5. Database Schema

#### 5.1 Supabase Tables
```sql
-- Users table (handled by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Saved recipes table
CREATE TABLE saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recipe cache table
CREATE TABLE recipe_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredients_hash VARCHAR(255) UNIQUE NOT NULL,
  recipe_data JSONB NOT NULL,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);
```

#### 5.2 Row Level Security (RLS)
```sql
-- Enable RLS on saved_recipes
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

-- Policy for saved_recipes
CREATE POLICY "Users can manage their own saved recipes" ON saved_recipes
  FOR ALL USING (auth.uid() = user_id);
```

### 6. Configuration Management

#### 6.1 Environment Variables
```bash
# Backend (.env)
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret

# Frontend (config.js)
const CONFIG = {
  API: {
    BASE_URL: 'http://localhost:3001/api'
  },
  STORAGE: {
    INGREDIENTS: 'recipe_finder_ingredients',
    RECIPES: 'recipe_finder_recipes',
    USER_DATA: 'recipe_finder_user_data'
  }
};
```

### 7. Security Implementation

#### 7.1 Authentication Flow
```javascript
// JWT Token Generation
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Password Hashing
const hashedPassword = await bcrypt.hash(password, 12);

// Token Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

#### 7.2 Input Validation
```javascript
// Frontend Validation
const validateIngredients = (ingredients) => {
  return ingredients.length >= 1 && ingredients.length <= 20;
};

// Backend Validation
const validateRecipeData = (req, res, next) => {
  const { ingredients } = req.body;
  
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'Valid ingredients array required' });
  }
  
  next();
};
```

### 8. Performance Optimization

#### 8.1 Caching Strategy
```javascript
// Recipe Caching Implementation
const cacheRecipe = async (ingredients, recipeData) => {
  const ingredientsHash = crypto
    .createHash('md5')
    .update(ingredients.sort().join(','))
    .digest('hex');
  
  await supabase
    .from('recipe_cache')
    .upsert({
      ingredients_hash: ingredientsHash,
      recipe_data: recipeData,
      access_count: 1,
      last_accessed: new Date()
    });
};

// Cache Retrieval
const getCachedRecipe = async (ingredients) => {
  const ingredientsHash = crypto
    .createHash('md5')
    .update(ingredients.sort().join(','))
    .digest('hex');
  
  const { data } = await supabase
    .from('recipe_cache')
    .select('*')
    .eq('ingredients_hash', ingredientsHash)
    .single();
  
  if (data) {
    // Increment access count
    await supabase
      .from('recipe_cache')
      .update({ 
        access_count: data.access_count + 1,
        last_accessed: new Date()
      })
      .eq('id', data.id);
  }
  
  return data;
};
```

#### 8.2 Frontend Optimization
```javascript
// Lazy Loading Implementation
const lazyLoadImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
};

// Debounced Search
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
```

### 9. Error Handling

#### 9.1 Backend Error Handling
```javascript
// Global Error Handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

// API Error Wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

#### 9.2 Frontend Error Handling
```javascript
// API Error Handler
const handleApiError = (error, context) => {
  console.error(`API Error in ${context}:`, error);
  
  if (error.status === 401) {
    // Handle authentication error
    window.authManager.logout();
    window.location.href = 'index.html';
  } else if (error.status === 429) {
    // Handle rate limiting
    showError('Too many requests. Please wait a moment and try again.');
  } else {
    // Generic error handling
    showError('An error occurred. Please try again.');
  }
};
```

### 10. Testing Strategy

#### 10.1 Unit Testing
```javascript
// Example test structure
describe('Recipe API', () => {
  test('should generate recipes for valid ingredients', async () => {
    const ingredients = ['chicken', 'rice'];
    const response = await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(5);
  });
});
```

#### 10.2 Integration Testing
- API endpoint testing
- Database integration testing
- Authentication flow testing
- Error handling testing

### 11. Deployment Configuration

#### 11.1 Production Environment
```bash
# Production environment variables
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=production_key
SUPABASE_URL=production_url
SUPABASE_ANON_KEY=production_key
JWT_SECRET=production_secret
```

#### 11.2 Build Process
```bash
# Build and start production server
npm run build
npm start
```

### 12. Monitoring and Logging

#### 12.1 Application Logging
```javascript
// Structured logging
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message, error = {}, meta = {}) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      error: error.message, 
      stack: error.stack, 
      ...meta 
    }));
  }
};
```

#### 12.2 Performance Monitoring
- API response time tracking
- Database query performance
- OpenAI API usage monitoring
- Error rate tracking

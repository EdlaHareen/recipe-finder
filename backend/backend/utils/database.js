const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/recipes.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let db;

const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }

            console.log('📦 Connected to SQLite database');

            // Create tables
            db.serialize(() => {
                // Recipes table
                db.run(`
                    CREATE TABLE IF NOT EXISTS recipes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        description TEXT,
                        ingredients TEXT NOT NULL,
                        instructions TEXT NOT NULL,
                        cooking_time INTEGER,
                        servings INTEGER,
                        difficulty TEXT,
                        cuisine_type TEXT,
                        dietary_tags TEXT,
                        image_url TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // User favorites table
                db.run(`
                    CREATE TABLE IF NOT EXISTS favorites (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_session TEXT NOT NULL,
                        recipe_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (recipe_id) REFERENCES recipes (id),
                        UNIQUE(user_session, recipe_id)
                    )
                `);

                // Recipe ratings table
                db.run(`
                    CREATE TABLE IF NOT EXISTS ratings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        recipe_id INTEGER NOT NULL,
                        user_session TEXT NOT NULL,
                        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                        review TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (recipe_id) REFERENCES recipes (id),
                        UNIQUE(recipe_id, user_session)
                    )
                `);

                // Search history table
                db.run(`
                    CREATE TABLE IF NOT EXISTS search_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_session TEXT NOT NULL,
                        ingredients TEXT NOT NULL,
                        search_query TEXT,
                        results_count INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                console.log('✅ Database tables initialized');
                resolve(db);
            });
        });
    });
};

const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
};

const closeDatabase = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📦 Database connection closed');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};
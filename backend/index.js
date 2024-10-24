const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Base route for testing
app.get('/', (req, res) => {
  res.send('IGDB Game Recommendation API');
});

// Helper function to get the genre ID based on the name
const getGenreID = async (genreName, clientID, accessToken) => {
    try {
      const response = await axios({
        url: 'https://api.igdb.com/v4/genres',
        method: 'POST',
        headers: {
          'Client-ID': clientID,
          Authorization: `Bearer ${accessToken}`,
        },
        data: `fields id, name; where name ~ *"${genreName}"*; limit 25;`,
      });
  
      if (response.data.length > 0) {
        return response.data[0].id;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching genre ID:', error.message);
      return null;
    }
};


// Updated sorting logic to prioritize review count
const sortGames = (games) => {
  const currentDate = new Date();
  const maxReviews = Math.max(...games.map(game => game.total_rating_count || 0));

  return games
    .filter(game => !game.parent_game && game.total_rating_count > 0) // Exclude expansions and filter games with reviews
    .sort((a, b) => {
      const aReviewWeight = a.total_rating_count / maxReviews; 
      const bReviewWeight = b.total_rating_count / maxReviews;
      
      const aUserScore = (a.total_rating || 0) * (1 + aReviewWeight); 
      const bUserScore = (b.total_rating || 0) * (1 + bReviewWeight);
      
      const aAge = (currentDate - new Date(a.first_release_date * 1000)) / (1000 * 60 * 60 * 24 * 365);
      const bAge = (currentDate - new Date(b.first_release_date * 1000)) / (1000 * 60 * 60 * 24 * 365);

      const aAgeFactor = aAge > 5 ? 0.9 : 1 - (aAge / 20);
      const bAgeFactor = bAge > 5 ? 0.9 : 1 - (bAge / 20);

      const aFinalScore = aUserScore * aAgeFactor;
      const bFinalScore = bUserScore * bAgeFactor;

      return bFinalScore - aFinalScore;
    });
};



const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.get('/games', async (req, res) => {
  try {
    const clientID = process.env.CLIENT_ID;
    const accessToken = process.env.ACCESS_TOKEN;
    const { genre, mood, platforms } = req.query;

    if (!clientID || !accessToken) {
      throw new Error('Missing IGDB API credentials in environment variables');
    }

    let allGames = [];
    let hasMoreGames = true;
    let offset = 0;

    while (hasMoreGames) {
      // Base query
      let query = 'fields name, genres.name, platforms.name, total_rating, total_rating_count, first_release_date, parent_game; limit 100;';
      
      let conditions = [];
      
      // Genre filter
      if (genre) {
        conditions.push(`genres = (${genre})`);
      }

      // Platform filter
      if (platforms) {
        const platformIds = platforms.split(',').map(id => id.trim()).join(',');
        conditions.push(`platforms = (${platformIds})`);
      }

      // Mood filter
      if (mood) {
        conditions.push(`themes.name ~ *"${mood}"*`);
      }

      // Add conditions to the query
      if (conditions.length > 0) {
        query += ` where ${conditions.join(' & ')};`;
      }

      // Query with pagination and delay
      await sleep(250); // Ensures 4 requests per second
      const response = await axios({
        url: 'https://api.igdb.com/v4/games',
        method: 'POST',
        headers: {
          'Client-ID': clientID,
          Authorization: `Bearer ${accessToken}`,
        },
        data: query + ` offset ${offset};`,
      });

      if (response.data.length > 0) {
        allGames = allGames.concat(response.data);
        offset += 100; // Fetch next set of games
      } else {
        hasMoreGames = false; // No more games to fetch
      }
    }

    const sortedGames = sortGames(allGames);
    res.json(sortedGames);
  } catch (error) {
    console.error('Error in /games route:', error.message, error.stack);
    res.status(500).json({ error: 'Error fetching game data' });
  }
});



// Rate a Game - Firestore Integration
app.post('/user/games/rate', async (req, res) => {
  const { userId, gameId, rating } = req.body;
  try {
    // Fetch game details from IGDB API to get name, genres, and platforms
    const clientID = process.env.CLIENT_ID;
    const accessToken = process.env.ACCESS_TOKEN;
    const gameResponse = await axios({
      url: 'https://api.igdb.com/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': clientID,
        Authorization: `Bearer ${accessToken}`,
      },
      data: `fields name, genres.name, platforms.name, aggregated_rating, rating, release_dates; where id = ${gameId};`,
    });    

    const game = gameResponse.data[0];
    const gameName = game?.name || 'Unknown Game';
    const genres = game?.genres?.map(genre => genre.name) || [];
    const platforms = game?.platforms?.map(platform => platform.name) || [];

    // Save rating data with additional details
    await db.collection('users').doc(userId).collection('ratings').doc(`${gameId}`).set({
      gameId,
      gameName,
      genres,
      platforms,
      rating: parseInt(rating, 10),
      ratedAt: new Date()
    });

    res.send({ message: 'Game rated successfully' });
  } catch (error) {
    console.error('Error rating game:', error);
    res.status(500).send({ error: 'Error rating game' });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
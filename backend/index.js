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

// IGDB Game Data Fetching Route
app.get('/games', async (req, res) => {
  try {
    const clientID = process.env.CLIENT_ID;
    const accessToken = process.env.ACCESS_TOKEN;
    const { genre, mood, platforms, sort } = req.query;

    if (!clientID || !accessToken) {
      throw new Error('Missing IGDB API credentials in environment variables');
    }

    // Base query
    let query = 'fields name, genres.name, platforms.name, aggregated_rating, total_rating, total_rating_count, first_release_date, themes; limit 50;';

    let conditions = [];

    if (genre) {
      conditions.push(`genres = (${genre})`);
    }

    // Filter by platform IDs
    if (platforms) {
      const platformIds = platforms.split(',').map(id => id.trim()).join(',');
      conditions.push(`platforms = (${platformIds})`);
    }

    if (mood) {
      conditions.push(`themes.name ~ *"${mood}"*`);
    }

    // Add conditions to the query
    if (conditions.length > 0) {
      query += ` where ${conditions.join(' & ')};`;
    }

    // Sorting by total_rating if requested
    if (sort === 'popularity') {
      query += ' sort total_rating desc;';
    }

    const response = await axios({
      url: 'https://api.igdb.com/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': clientID,
        Authorization: `Bearer ${accessToken}`,
      },
      data: query,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error in /games route:', error.message, error.stack);
    res.status(500).json({ error: 'Error fetching game data' });
  }
});



  
// Route to Fetch Genres
app.get('/genres', async (req, res) => {
    try {
      const clientID = process.env.CLIENT_ID;
      const accessToken = process.env.ACCESS_TOKEN;
  
      const response = await axios({
        url: 'https://api.igdb.com/v4/genres',
        method: 'POST',
        headers: {
          'Client-ID': clientID,
          Authorization: `Bearer ${accessToken}`,
        },
        data: 'fields id, name; limit 50; offset 0;',
      });
  
      res.json(response.data);
    } catch (error) {
        console.error('Error fetching genres:', error.message, error.stack);
        res.status(500).json({ error: 'Error fetching genre data' });
    }
});

// Route to Fetch Themes
app.get('/themes', async (req, res) => {
    try {
      const clientID = process.env.CLIENT_ID;
      const accessToken = process.env.ACCESS_TOKEN;
  
      const response = await axios({
        url: 'https://api.igdb.com/v4/themes',
        method: 'POST',
        headers: {
          'Client-ID': clientID,
          Authorization: `Bearer ${accessToken}`,
        },
        data: 'fields id, name; limit 50; offset 0;',
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching themes:', error.message);
      res.status(500).json({ error: 'Error fetching theme data' });
    }
});
   
// Mark a Game as Played - Firestore Integration
app.post('/user/games/played', async (req, res) => {
  const { userId, gameId } = req.body;
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
      data: `fields name, genres.name, platforms.name; where id = ${gameId};`,
    });

    const game = gameResponse.data[0];
    const gameName = game?.name || 'Unknown Game';
    const genres = game?.genres?.map(genre => genre.name) || [];
    const platforms = game?.platforms?.map(platform => platform.name) || [];

    // Save played game data with additional details
    await db.collection('users').doc(userId).collection('playedGames').doc(`${gameId}`).set({
      gameId,
      gameName,
      genres,
      platforms,
      played: new Date()
    });

    res.send({ message: 'Game marked as played' });
  } catch (error) {
    console.error('Error marking game as played:', error);
    res.status(500).send({ error: 'Error marking game as played' });
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

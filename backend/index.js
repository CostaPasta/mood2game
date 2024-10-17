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
        data: `fields id, name; where name ~ *"${genreName}"*; limit 50;`,
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
      const { genre, mood } = req.query;
  
      if (!clientID || !accessToken) {
        throw new Error('Missing IGDB API credentials in environment variables');
      }
  
      let query = 'fields name, genres.name, themes.name, rating, platforms.name; limit 50;';
  
      if (genre) {
        query = `
          fields name, genres.name, themes.name, rating, platforms.name;
          where genres = (${genre});
          limit 50;
        `;
      } else if (mood) {
        query = `
          fields name, genres.name, themes.name, rating, platforms.name;
          where themes.name ~ *"${mood}"*;
          limit 50;
        `;
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
        data: 'fields id, name; limit 500; offset 0;',
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
        data: 'fields id, name; limit 500; offset 0;',
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
    await db.collection('users').doc(userId).collection('playedGames').doc(`${gameId}`).set({
      gameId,
      played: new Date() // Use 'played' as per existing Firestore field
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
    await db.collection('users').doc(userId).collection('ratings').doc(`${gameId}`).set({
      gameId,
      rating: parseInt(rating, 6), // Store as 'rating' as per existing Firestore field
      ratedAt: new Date() // You can add an additional field if needed
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

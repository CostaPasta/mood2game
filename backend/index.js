const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cors()); // Enable CORS for all routes

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
        data: `fields id, name; where name ~ *"${genreName}"*; limit 1;`,
      });
  
      // If the genre is found, return its ID
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
  
      // Base query for IGDB API
      let query = 'fields name, genres.name, themes.name, rating, platforms.name; limit 10;';
  
      // Modify query based on genre ID or mood
      if (genre) {
        query = `
          fields name, genres.name, themes.name, rating, platforms.name;
          where genres = (${genre});
          limit 10;
        `;
      } else if (mood) {
        query = `
          fields name, genres.name, themes.name, rating, platforms.name;
          where themes.name ~ *"${mood}"*;
          limit 10;
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
        data: `fields id, name; limit 50;`, // Fetch up to 50 genre names and IDs
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching genres:', error.message, error.stack);
      res.status(500).json({ error: 'Error fetching genre data' });
    }
});
  
  
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
        data: 'fields id, name; limit 50;',
      });
  
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching themes:', error.message);
      res.status(500).json({ error: 'Error fetching theme data' });
    }
});
   

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

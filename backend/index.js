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


const moodMapping = {
  Calm: ['Sandbox', 'Educational', 'Kids', 'Open world', 'Drama'],
  Adventurous: ['Fantasy', 'Action', 'Historical', 'Science fiction'],
  Social: ['Party', 'Comedy', 'Romance', 'Business'],
  Competitive: ['Warfare', 'Sports', '4X (explore, expand, exploit, and exterminate)'],
  Immersive: ['Mystery', 'Thriller', 'Stealth', 'Romance'],
  Intense: ['Horror', 'Survival'],
  Casual: ['Non-fiction', 'Open world', 'Sandbox'],
};


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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Updated sorting logic to prioritize review count
const sortGames = (games, userPreferences = null) => {
  const currentDate = new Date();
  const maxReviews = Math.max(...games.map(game => game.total_rating_count || 0));

  return games
    .filter(game => game.total_rating_count > 0 && !game.parent_game) // Exclude games with no reviews or expansions
    .map(game => {
      const reviewWeight = game.total_rating_count / maxReviews;
      const userScore = (game.total_rating || 0) * (1 + reviewWeight);

      const age = (currentDate - new Date(game.first_release_date * 1000)) / (1000 * 60 * 60 * 24 * 365);
      const ageFactor = age > 5 ? 0.9 : 1 - (age / 20);

      let preferenceScore = 0;
      if (userPreferences) {
        const genres = userPreferences.genres || {}; // Default to an empty object
        const themes = userPreferences.themes || {}; // Default to an empty object
        const platforms = userPreferences.platforms || {}; // Default to an empty object

        game.genres?.forEach(genre => {
          if (genres[genre]) preferenceScore += genres[genre];
        });
        game.themes?.forEach(theme => {
          if (themes[theme]) preferenceScore += themes[theme];
        });
        game.platforms?.forEach(platform => {
          if (platforms[platform]) preferenceScore += platforms[platform];
        });
      }

      return {
        ...game,
        finalScore: userScore * ageFactor + preferenceScore,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
};




const fetchGamesInParallel = async (query) => {
  const batchSize = 100;
  const maxGames = 2000; 
  let allGames = [];
  let offset = 0;

  while (allGames.length < maxGames) {
    const [batch1, batch2] = await Promise.all([
      fetchGames(offset, batchSize, query),
      fetchGames(offset + batchSize, batchSize, query),
    ]);

    allGames = allGames.concat(batch1, batch2);

    if (!batch1.length && !batch2.length) break;

    offset += batchSize * 2;

    // Wait to respect the rate limit (4 requests per second)
    await sleep(250);
  }

  return allGames;
};


const fetchGames = async (offset, limit = 100, query) => {
  await sleep(250);
  try {
    const response = await axios({
      url: 'https://api.igdb.com/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': process.env.CLIENT_ID,
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
      data: `${query} offset ${offset}; limit ${limit}; sort total_rating_count desc;`,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching games from IGDB:', error.response?.data || error.message);
    throw error;
  }
};



const getUserPlayedGames = async (userId) => {
  try {
    const snapshot = await db.collection('users').doc(userId).collection('playedGames').get();
    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error('Error fetching played games:', error);
    return [];
  }
};

const getUserRatedGames = async (userId) => {
  try {
    const snapshot = await db.collection('users').doc(userId).collection('ratings').get();
    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error('Error fetching rated games:', error);
    return [];
  }
};

const enhanceWithRecommendations = (games, playedGames, ratedGames) => {
  const genreScores = {};
  const platformScores = {};

  // Analyze played and rated games
  [...playedGames, ...ratedGames].forEach((game) => {
    game.genres.forEach((genre) => {
      genreScores[genre] = (genreScores[genre] || 0) + 1;
    });
    game.platforms.forEach((platform) => {
      platformScores[platform] = (platformScores[platform] || 0) + 1;
    });
  });

  // Adjust game scores
  return games.map((game) => {
    const genreBoost = game.genres.reduce((sum, genre) => sum + (genreScores[genre] || 0), 0);
    const platformBoost = game.platforms.reduce((sum, platform) => sum + (platformScores[platform] || 0), 0);
    return {
      ...game,
      finalScore: game.finalScore + genreBoost * 2 + platformBoost,
    };
  }).sort((a, b) => b.finalScore - a.finalScore);
};


app.get('/games', async (req, res) => {
  try {
    const clientID = process.env.CLIENT_ID;
    const accessToken = process.env.ACCESS_TOKEN;
    const { genre, mood, platforms, userId } = req.query;

    if (!clientID || !accessToken) {
      throw new Error('Missing IGDB API credentials in environment variables');
    }

    let query = 'fields id, name, genres.name, themes, platforms.name, total_rating, total_rating_count, first_release_date, parent_game;';
    const conditions = ['first_release_date > 1136073600'];

    if (genre) conditions.push(`genres = (${genre})`);
    if (platforms) {
      const platformIds = platforms.split(',').map((id) => id.trim()).join(',');
      conditions.push(`platforms = (${platformIds})`);
    }

    if (conditions.length) query += ` where ${conditions.join(' & ')};`;

    // Fetch games from IGDB
    let allGames = await fetchGamesInParallel(query);

    // Fetch playedGames collection from Firebase
    let playedGames = [];
    if (userId) {
      const snapshot = await db.collection('users').doc(userId).collection('playedGames').get();
      playedGames = snapshot.docs.map((doc) => doc.data());
    }

    // Filter by mood
    if (mood && moodMapping[mood]) {
      const themeResponse = await axios.post(
        'https://api.igdb.com/v4/themes',
        `fields id, name; where name = (${moodMapping[mood].map((name) => `"${name}"`).join(',')});`,
        {
          headers: {
            'Client-ID': clientID,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const moodThemes = themeResponse.data.map((theme) => theme.id);

      allGames = allGames.filter((game) =>
        game.themes?.some((theme) => moodThemes.includes(theme))
      );

      console.log('Filtered Games by Mood:', allGames); // Debug log
    }

    // Merge Firebase data into IGDB games
    const mergedGames = allGames.map((game) => {
      const playedGame = playedGames.find((g) => g.gameId === game.id);

      return {
        ...game,
        played: !!playedGame, // Mark as played if found in Firebase
        rated: playedGame?.rating !== undefined, // Mark as rated if `rating` exists
        rating: playedGame?.rating || null, // Include rating if available
      };
    });

    res.json(mergedGames);
  } catch (error) {
    console.error('Error in /games route:', error.message);
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


// Rate a Game - Firestore Integration
app.post('/user/games/rate', async (req, res) => {
  const { userId, gameId, rating } = req.body;

  if (!userId || !gameId || rating === undefined) {
    return res.status(400).json({ error: 'userId, gameId, and rating are required.' });
  }

  try {
    // Update the rating in the existing playedGames document
    await db.collection('users').doc(userId).collection('playedGames').doc(`${gameId}`).set(
      { rating: parseInt(rating, 10) },
      { merge: true }
    );

    res.send({ message: 'Game rated successfully' });
  } catch (error) {
    console.error('Error rating game:', error);
    res.status(500).send({ error: 'Error rating game' });
  }
});




app.post('/user/games/played', async (req, res) => {
  const { userId, gameId } = req.body;

  if (!userId || !gameId) {
    return res.status(400).json({ error: 'userId and gameId are required.' });
  }

  try {
    const clientID = process.env.CLIENT_ID;
    const accessToken = process.env.ACCESS_TOKEN;

    const gameResponse = await axios({
      url: 'https://api.igdb.com/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': clientID,
        Authorization: `Bearer ${accessToken}`,
      },
      data: `fields id, name, genres.name, platforms.name; where id = ${gameId};`,
    });

    const game = gameResponse.data[0];
    const gameName = game?.name || 'Unknown Game';
    const genres = game?.genres?.map((genre) => genre.name) || [];
    const platforms = game?.platforms?.map((platform) => platform.name) || [];

    await db.collection('users').doc(userId).collection('playedGames').doc(`${gameId}`).set(
      {
        gameId, // Map `id` to `gameId` here
        gameName,
        genres,
        platforms,
        playedAt: new Date(),
      },
      { merge: true }
    );

    res.send({ message: 'Game marked as played successfully' });
  } catch (error) {
    console.error('Error marking game as played:', error);
    res.status(500).send({ error: 'Error marking game as played' });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});



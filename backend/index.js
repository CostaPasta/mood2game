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
const sortGames = (games, moodThemes = []) => {
  const currentDate = new Date();
  const maxReviews = Math.max(...games.map(game => game.total_rating_count || 0));

  return games
    .filter(game => {
      const hasReviews = game.total_rating_count > 0;
      const isNotExpansion = !game.parent_game;
      const matchesMood = moodThemes.length === 0 || (game.themes && game.themes.some(t => moodThemes.includes(t)));
      return hasReviews && isNotExpansion && matchesMood;
    })
    .map(game => {
      const themeIds = game.themes || [];
      const moodRelevance = moodThemes.length > 0 
        ? themeIds.reduce((acc, themeId, index) => {
            const weight = 1 / Math.pow(2, index);
            return moodThemes.includes(themeId) ? acc + weight : acc;
          }, 0)
        : 0; // Skip mood scoring if no themes match.

      const reviewWeight = game.total_rating_count / maxReviews;
      const userScore = (game.total_rating || 0) * (1 + reviewWeight);

      const age = (currentDate - new Date(game.first_release_date * 1000)) / (1000 * 60 * 60 * 24 * 365);
      const ageFactor = age > 5 ? 0.9 : 1 - (age / 20);

      return {
        ...game,
        finalScore: userScore * ageFactor + moodRelevance * 5,
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
  await sleep(250); // Control rate limit of 4 requests per second
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
};

app.get('/games', async (req, res) => {
  try {
    const clientID = process.env.CLIENT_ID;
    const accessToken = process.env.ACCESS_TOKEN;
    const { genre, mood, platforms } = req.query;

    if (!clientID || !accessToken) {
      throw new Error('Missing IGDB API credentials in environment variables');
    }

    let query = 'fields name, genres.name, themes, platforms.name, total_rating, total_rating_count, first_release_date, parent_game;';
    const conditions = ['first_release_date > 1136073600'];

    if (genre) conditions.push(`genres = (${genre})`);
    if (platforms) {
      const platformIds = platforms.split(',').map((id) => id.trim()).join(',');
      conditions.push(`platforms = (${platformIds})`);
    }

    if (conditions.length) query += ` where ${conditions.join(' & ')};`;

    let allGames = await fetchGamesInParallel(query);

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
      allGames = sortGames(allGames, moodThemes).slice(0, 50);
    } else {
      allGames = sortGames(allGames).slice(0, 50);
    }

    res.json(allGames);
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

app.post('/user/games/played', async (req, res) => {
  const { userId, gameId } = req.body;
  try {
    await db.collection('users').doc(userId).collection('playedGames').doc(`${gameId}`).set({
      gameId,
      playedAt: new Date(),
    });
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


// app.get('/games', async (req, res) => {
//   try {
//     const clientID = process.env.CLIENT_ID;
//     const accessToken = process.env.ACCESS_TOKEN;
//     const { genre, mood, platforms } = req.query;

//     if (!clientID || !accessToken) {
//       throw new Error('Missing IGDB API credentials in environment variables');
//     }

//     let allGames = [];
//     let hasMoreGames = true;
//     let offset = 0;

//     while (hasMoreGames) {
//       // Base query
//       let query = 'fields name, genres.name, themes, platforms.name, total_rating, total_rating_count, first_release_date, parent_game; limit 100;';
      
//       let conditions = [];
      
//       // Genre filter
//       if (genre) {
//         conditions.push(`genres = (${genre})`);
//       }

//       // Platform filter
//       if (platforms) {
//         const platformIds = platforms.split(',').map(id => id.trim()).join(',');
//         conditions.push(`platforms = (${platformIds})`);
//       }

//       // Mood filter
//       if (mood) {
//         conditions.push(`themes.name ~ *"${mood}"*`);
//       }

//       // Add conditions to the query
//       if (conditions.length > 0) {
//         query += ` where ${conditions.join(' & ')};`;
//       }

//       // Query with pagination and delay
//       await sleep(250); // Ensures 4 requests per second
//       const response = await axios({
//         url: 'https://api.igdb.com/v4/games',
//         method: 'POST',
//         headers: {
//           'Client-ID': clientID,
//           Authorization: `Bearer ${accessToken}`,
//         },
//         data: query + ` offset ${offset};`,
//       });

//       if (response.data.length > 0) {
//         allGames = allGames.concat(response.data);
//         offset += 100; // Fetch next set of games
//       } else {
//         hasMoreGames = false; // No more games to fetch
//       }
//     }

//     const sortedGames = sortGames(allGames).slice(0, 25); // Limit to top 25 games
//     res.json(sortedGames);
//   } catch (error) {
//     console.error('Error in /games route:', error.message, error.stack);
//     res.status(500).json({ error: 'Error fetching game data' });
//   }
// });

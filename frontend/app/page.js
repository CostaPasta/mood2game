'use client';

import React, { useState } from 'react';
import GenreMoodSelector from '../components/GenreMoodSelector';

export default function Home() {
  const [games, setGames] = useState([]);

  const fetchGames = async (type, value) => {
    try {
      const url = `http://localhost:5001/games?${type}=${value}`;
      console.log('Fetching from:', url); // Debug the URL being used
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch game data');
      }

      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  return (
    <div>
      <h1>Welcome to the Game Recommender</h1>
      <GenreMoodSelector onFilterSelect={fetchGames} />
      <div>
        {games.length > 0 && (
          <ul>
            {games.map((game) => (
              <li key={game.id}>{game.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

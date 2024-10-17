'use client';

import React, { useState } from 'react';
import GenreMoodSelector from '../components/GenreMoodSelector';
import GameList from '../components/GameList';
import { auth } from './firebaseConfig'; // Ensure you have Firebase Auth initialized


export default function Home() {
  const [games, setGames] = useState([]);

  const fetchGames = async (type, value) => {
    try {
      const url = `http://localhost:5001/games?${type}=${value}`;
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

  const markAsPlayed = async (gameId) => {
    try {
      const userId = auth.currentUser.uid; // Get the user's Firebase UID
      const response = await fetch('http://localhost:5001/user/games/played', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, gameId }),
      });
  
      if (response.ok) {
        console.log(`Game ${gameId} marked as played`);
      } else {
        console.error('Failed to mark game as played');
      }
    } catch (error) {
      console.error('Error marking game as played:', error);
    }
  };

  const rateGame = async (gameId) => {
    const rating = prompt('Rate this game (1-5):');
    try {
      const userId = auth.currentUser.uid; // Get the user's Firebase UID
      const response = await fetch('http://localhost:5001/user/games/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, gameId, rating }),
      });
  
      if (response.ok) {
        console.log(`Game ${gameId} rated with ${rating} stars`);
      } else {
        console.error('Failed to rate game');
      }
    } catch (error) {
      console.error('Error rating game:', error);
    }
  };

  return (
    <div>
      <h1>Welcome to the Game Recommender</h1>
      <GenreMoodSelector onFilterSelect={fetchGames} />
      <GameList games={games} onMarkPlayed={markAsPlayed} onRateGame={rateGame} />
    </div>
  );
}

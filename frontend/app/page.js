'use client';

// Existing imports...
import React, { useState } from 'react';
import GenreMoodSelector from '../components/GenreMoodSelector';
import GameList from '../components/GameList';
import PlatformFilter from '../components/PlatformFilter'; 
import { auth } from './firebaseConfig';

export default function Home() {
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);

  // Fetch games with added fields
  const fetchGames = async (type, value) => {
    try {
      const userId = auth.currentUser?.uid; // Get user ID
      let url = `http://localhost:5001/games?${type}=${value}`;
      
      if (userId) url += `&userId=${userId}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch games');
      
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };
  
  

  const markAsPlayed = async (id) => {
    try {
      const userId = auth.currentUser.uid;
  
      if (!id) {
        console.error('Invalid id:', id);
        return;
      }
  
      const response = await fetch('http://localhost:5001/user/games/played', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId: id }), // Map `id` to `gameId`
      });
  
      if (response.ok) {
        setGames((prevGames) =>
          prevGames.map((game) =>
            game.id === id ? { ...game, played: true } : game
          )
        );
      } else {
        console.error('Failed to mark game as played');
      }
    } catch (error) {
      console.error('Error marking game as played:', error);
    }
  };
  
  
  
  const rateGame = async (id) => {
    const rating = prompt('Rate this game (1-5):');
    if (!rating) return; // Exit if no rating is provided
  
    try {
      const userId = auth.currentUser.uid;
  
      if (!id) {
        console.error('Invalid id:', id);
        return;
      }
  
      const response = await fetch('http://localhost:5001/user/games/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId: id, rating }), // Map `id` to `gameId`
      });
  
      if (response.ok) {
        setGames((prevGames) =>
          prevGames.map((game) =>
            game.id === id
              ? { ...game, rated: true, rating: parseInt(rating, 10) }
              : game
          )
        );
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
      <PlatformFilter onPlatformChange={setPlatforms} /> 
      <GenreMoodSelector onFilterSelect={fetchGames} />
      <GameList games={games} onMarkPlayed={markAsPlayed} onRateGame={rateGame} />
    </div>
  );
}


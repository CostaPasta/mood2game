import React from 'react';

const GameList = ({ games, onMarkPlayed, onRateGame }) => {
  return (
    <div>
      {games.map((game) => (
        <div key={game.id} style={{ marginBottom: '20px' }}>
          <h3>{game.name}</h3>
          <p>User Rating: {game.total_rating || 'N/A'} ({game.total_rating_count || 0} reviews)</p>
          <p>Release Date: {game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString() : 'Unknown'}</p>
          <button onClick={() => onMarkPlayed(game.id)}>Mark as Played</button>
          <button onClick={() => onRateGame(game.id)}>Rate Game</button>
        </div>
      ))}
    </div>
  );
};

export default GameList;

import React from 'react';

const GameList = ({ games, onMarkPlayed, onRateGame }) => {
  return (
    <div>
      {games.map((game) => (
        <div key={game.id} style={{ marginBottom: '20px' }}>
          <h3>{game.name}</h3>
          <button onClick={() => onMarkPlayed(game.id)}>Mark as Played</button>
          <button onClick={() => onRateGame(game.id)}>Rate Game</button>
        </div>
      ))}
    </div>
  );
};

export default GameList;

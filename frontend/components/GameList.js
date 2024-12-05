import React from 'react';

const GameList = ({ games, onMarkPlayed, onRateGame }) => {
  return (
    <div>
      {games.map((game) => (
        <div key={game.id} className="game-item">
          <h3>{game.name}</h3>
          <p>Genres: {game.genres?.map((genre) => genre.name).join(', ')}</p>
          <p>Platforms: {game.platforms?.map((platform) => platform.name).join(', ')}</p>
          <p>
            {game.played ? '✅ Played' : '❌ Not Played'} | 
            {game.rated ? `⭐ Rated (${game.rating || 'No Rating'})` : 'Not Rated'}
          </p>
          {!game.played && (
            <button onClick={() => onMarkPlayed(game.id)}>Mark as Played</button>
          )}
          {game.played && !game.rated && (
            <button onClick={() => onRateGame(game.id)}>Rate Game</button>
          )}
        </div>
      ))}
    </div>
  );
};



export default GameList;



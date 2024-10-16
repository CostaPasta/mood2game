'use client';

import React, { useEffect, useState } from 'react';

const GenreMoodSelector = ({ onFilterSelect }) => {
  const [filterType, setFilterType] = useState('genre'); // Default to genre
  const [filterValue, setFilterValue] = useState(''); // Stores the selected genre or mood value
  const [genres, setGenres] = useState([]); // Holds the list of genres fetched from the backend

  // Fetch genres from the backend when the component loads
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch('http://localhost:5001/genres'); // Fetch genres from the backend
        const data = await response.json();
        setGenres(data); // Store the genres in state
        setFilterValue(data[0]?.id || ''); // Set default value to the first genre ID
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };

    fetchGenres();
  }, []);

  // Update the filter type and set the appropriate default value
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFilterType(newType);
    setFilterValue(newType === 'genre' ? genres[0]?.id || '' : 'Horror'); // Set the default value based on type
  };

  // Update the selected filter value based on user input
  const handleValueChange = (e) => {
    setFilterValue(e.target.value);
  };

  // Submit the selected filter type and value
  const handleSubmit = () => {
    if (filterValue) {
      onFilterSelect(filterType, filterValue);
    }
  };

  return (
    <div>
      <h2>Find Games Based on Genre or Mood</h2>
      <label>
        Select Filter Type:
        <select value={filterType} onChange={handleTypeChange}>
          <option value="genre">Genre</option>
          <option value="mood">Mood</option>
        </select>
      </label>
      <br />
      <label>
        Select {filterType === 'genre' ? 'Genre' : 'Mood'}:
        {filterType === 'genre' ? (
          <select value={filterValue} onChange={handleValueChange}>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        ) : (
          <select value={filterValue} onChange={handleValueChange}>
            <option value="Horror">Horror</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Science fiction">Sci-Fi</option>
            <option value="Thriller">Thriller</option>
          </select>
        )}
      </label>
      <br />
      <button onClick={handleSubmit}>Find Games</button>
    </div>
  );
};

export default GenreMoodSelector;

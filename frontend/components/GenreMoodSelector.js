'use client';

import React, { useEffect, useState } from 'react';

const moodMapping = {
  Calm: ['Sandbox', 'Educational', 'Kids', 'Open world', 'Drama'],
  Adventurous: ['Fantasy', 'Action', 'Historical', 'Science fiction'],
  Social: ['Party', 'Comedy', 'Romance', 'Business'],
  Competitive: ['Warfare', 'Sports', '4X (explore, expand, exploit, and exterminate)'],
  Immersive: ['Mystery', 'Thriller', 'Stealth', 'Romance'],
  Intense: ['Horror', 'Survival'],
  Casual: ['Non-fiction', 'Open world', 'Sandbox'],
};

const GenreMoodSelector = ({ onFilterSelect }) => {
  const [filterType, setFilterType] = useState('genre');
  const [filterValue, setFilterValue] = useState('');
  const [genres, setGenres] = useState([]);

  const [moods, setMoods] = useState(Object.keys(moodMapping)); // Get all mood categories
  const [selectedMoodThemes, setSelectedMoodThemes] = useState([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch('http://localhost:5001/genres');
        const data = await response.json();
        setGenres(data);
        setFilterValue(data[0]?.id || '');
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };
    fetchGenres();
  }, []);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFilterType(newType);
    setFilterValue(newType === 'genre' ? genres[0]?.id || '' : 'Calm');
    if (newType === 'mood') {
      setSelectedMoodThemes(moodMapping['Calm']);
    }
  };

  const handleMoodChange = (e) => {
    const mood = e.target.value;
    setFilterValue(mood);
    setSelectedMoodThemes(moodMapping[mood]);
  };

  const handleValueChange = (e) => {
    setFilterValue(e.target.value);
  };

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
      {filterType === 'genre' ? (
        <label>
          Select Genre:
          <select value={filterValue} onChange={handleValueChange}>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Select Mood:
          <select value={filterValue} onChange={handleMoodChange}>
            {moods.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
          <br />
          <label>Themes: {selectedMoodThemes.join(', ')}</label>
        </label>
      )}
      <br />
      <button onClick={handleSubmit}>Find Games</button>
    </div>
  );
};

export default GenreMoodSelector;

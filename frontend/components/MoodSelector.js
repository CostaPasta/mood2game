import React, { useState } from 'react';

const MoodSelector = ({ onMoodSelect }) => {
  const [mood, setMood] = useState('');

  const handleMoodChange = (e) => {
    setMood(e.target.value);
  };

  const handleSubmit = () => {
    onMoodSelect(mood);
  };

  return (
    <div>
      <h2>Select Your Mood</h2>
      <input
        type="text"
        placeholder="Enter a mood (e.g., adventure, horror)"
        value={mood}
        onChange={handleMoodChange}
      />
      <button onClick={handleSubmit}>Find Games</button>
    </div>
  );
};

export default MoodSelector;

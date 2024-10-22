import React, { useState } from 'react';

const PlatformFilter = ({ onPlatformChange }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const platforms = [
    { id: 'PlayStation', name: 'PlayStation' },  // Use string keys to distinguish platform families
    { id: 'Xbox', name: 'Xbox' },
    { id: '130', name: 'Nintendo Switch' },  // ID for Nintendo Switch
    { id: 6, name: 'PC' },  // ID for PC
    { id: 'Mobile', name: 'Mobile' }  // Example mobile platform
  ];

  const platformMapping = {
    'PlayStation': [7, 48, 167, 9],  // PlayStation IDs
    'Xbox': [49, 12, 169],  // Xbox IDs
    'Mobile': [39, 34]
  };

  
  const handlePlatformChange = (platformId) => {
    const platformIds = platformMapping[platformId] || [platformId];  // Check if the platform is a family
    const updatedPlatforms = selectedPlatforms.some(id => platformIds.includes(id))
      ? selectedPlatforms.filter((id) => !platformIds.includes(id))
      : [...selectedPlatforms, ...platformIds.filter(id => !selectedPlatforms.includes(id))];
    
    setSelectedPlatforms(updatedPlatforms);
    onPlatformChange(updatedPlatforms);
  };
  

  return (
    <div>
      <h3>Select Platforms</h3>
      {platforms.map((platform) => (
        <div key={platform.id}>
          <input
            type="checkbox"
            value={platform.id}
            onChange={() => handlePlatformChange(platform.id)}
          />
          <label>{platform.name}</label>
        </div>
      ))}
    </div>
  );
};

export default PlatformFilter;

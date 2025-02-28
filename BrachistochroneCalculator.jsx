import React, { useState, useEffect } from 'react';

const VERSION = "v0.1";

// Physical constants
const CONSTANTS = {
  G_MULTIPLIER: 0.0098, // km/s² per g
  G: 0.0098, // km/s² (1g acceleration)
  G_1_3: 0.00326667, // km/s² (1/3g acceleration)
  AU_TO_KM: 1.496e8, // kilometers per AU
  C: 299792.458, // Speed of light in km/s
};

// Planetary orbital parameters
const PLANETS = {
  'Mercury': { perihelion: 0.307, aphelion: 0.467 },
  'Venus': { perihelion: 0.718, aphelion: 0.728 },
  'Earth': { perihelion: 0.983, aphelion: 1.017 },
  'Mars': { perihelion: 1.381, aphelion: 1.666 },
  'Ceres': { perihelion: 2.5518, aphelion: 2.9775 },
  'Jupiter': { perihelion: 4.950, aphelion: 5.457 },
  'Saturn': { perihelion: 9.041, aphelion: 10.124 },
  'Uranus': { perihelion: 18.375, aphelion: 20.063 },
  'Neptune': { perihelion: 29.767, aphelion: 30.441 }
};

// Planet order for display in dropdowns
const PLANET_ORDER = [
  'Mercury', 'Venus', 'Earth', 'Mars', 'Ceres', 
  'Jupiter', 'Saturn', 'Uranus', 'Neptune'
];

// Helper functions from the Python script
const daysToDhm = (days) => {
  const totalHours = days * 24;
  const d = Math.floor(totalHours / 24);
  const h = Math.floor(totalHours % 24);
  return `${d}d ${h}h`;
};

const formatNumber = (number, decimals = 0) => {
  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const BrachistochroneCalculator = () => {
  const [originPlanet, setOriginPlanet] = useState('Earth');
  const [destinationPlanet, setDestinationPlanet] = useState('Mars');
  const [acceleration, setAcceleration] = useState(CONSTANTS.G_1_3);
  const [gValue, setGValue] = useState(0.33); // Store g value separately
  const [results, setResults] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrixData, setMatrixData] = useState([]);

  // Calculate brachistochrone time for given distance and acceleration
  const calculateBrachistochroneTime = (distanceKm, accelerationKms2) => {
    return 2 * Math.sqrt(distanceKm / accelerationKms2);
  };

  // Calculate maximum velocity achieved at midpoint
  const calculateMaxVelocity = (timeSeconds, accelerationKms2) => {
    return accelerationKms2 * (timeSeconds / 2);
  };

  // Calculate total delta-v required for the mission
  const calculateTotalDeltav = (maxVelocity) => {
    return 2 * maxVelocity;
  };

  // Calculate minimum and maximum possible distances between two planetary orbits
  const getOrbitalDistances = (p1, p2) => {
    const minDist = Math.max(0, Math.max(p1.perihelion, p2.perihelion) - Math.min(p1.aphelion, p2.aphelion));
    const maxDist = p1.aphelion + p2.aphelion;
    return [minDist, maxDist];
  };

  // Calculate median distance between two planetary orbits
  const calculateMedianDistance = (p1, p2) => {
    const r1 = (p1.perihelion + p1.aphelion) / 2;
    const r2 = (p2.perihelion + p2.aphelion) / 2;
    
    if (Math.abs(r1 - 1) < 0.1) { // If origin is Earth's orbit
      return Math.sqrt(1 + r2 * r2);
    } else {
      const m1 = Math.sqrt(1 + r1 * r1);
      const m2 = Math.sqrt(1 + r2 * r2);
      return Math.abs(m2 - m1);
    }
  };

  // Calculate complete travel metrics between two planets
  const calculateMetrics = (origin, destination, acceleration) => {
    const [minDist, maxDist] = getOrbitalDistances(origin, destination);
    const minDistKm = minDist * CONSTANTS.AU_TO_KM;
    const maxDistKm = maxDist * CONSTANTS.AU_TO_KM;
    
    const minTime = calculateBrachistochroneTime(minDistKm, acceleration);
    const maxTime = calculateBrachistochroneTime(maxDistKm, acceleration);
    
    const medianDist = calculateMedianDistance(origin, destination);
    const medianTime = calculateBrachistochroneTime(
      medianDist * CONSTANTS.AU_TO_KM, acceleration);
    
    const minVelocity = calculateMaxVelocity(minTime, acceleration);
    const maxVelocity = calculateMaxVelocity(maxTime, acceleration);
    
    return {
      minDistance: minDist,
      maxDistance: maxDist,
      minDistanceKm: minDistKm,
      maxDistanceKm: maxDistKm,
      minTime: minTime / 86400, // Convert to days
      maxTime: maxTime / 86400,
      medianTime: medianTime / 86400,
      minDeltaV: calculateTotalDeltav(minVelocity),
      maxDeltaV: calculateTotalDeltav(maxVelocity),
      minVelocity,
      maxVelocity
    };
  };

  // Generate the travel time matrix for all planets
  const generateMatrix = () => {
    const matrix = [];
    
    for (let i = 0; i < PLANET_ORDER.length; i++) {
      for (let j = i + 1; j < PLANET_ORDER.length; j++) {
        const origin = PLANET_ORDER[i];
        const destination = PLANET_ORDER[j];
        
        const metrics = calculateMetrics(
          PLANETS[origin], 
          PLANETS[destination], 
          acceleration
        );
        
        matrix.push({
          origin,
          destination,
          minTime: metrics.minTime,
          maxTime: metrics.maxTime,
          minDeltaV: metrics.minDeltaV,
          maxDeltaV: metrics.maxDeltaV
        });
      }
    }
    
    return matrix.sort((a, b) => a.minDeltaV - b.minDeltaV);
  };

  // Calculate results when inputs change
  useEffect(() => {
    if (originPlanet === destinationPlanet) {
      setResults(null);
      return;
    }
    
    const metrics = calculateMetrics(
      PLANETS[originPlanet], 
      PLANETS[destinationPlanet], 
      acceleration
    );
    
    setResults(metrics);
    setMatrixData(generateMatrix());
  }, [originPlanet, destinationPlanet, acceleration]);

  // Handle acceleration slider change
  const handleAccelerationChange = (e) => {
    const value = parseFloat(e.target.value);
    setGValue(value);
    setAcceleration(CONSTANTS.G_MULTIPLIER * value);
  };

  // Handle preset buttons
  const setPresetAcceleration = (preset) => {
    if (preset === "1/3g") {
      setGValue(0.33);
      setAcceleration(CONSTANTS.G_1_3);
    } else if (preset === "1g") {
      setGValue(1);
      setAcceleration(CONSTANTS.G);
    }
  };

  // Format percentages of light speed
  const formatLightspeedPercentage = (velocity) => {
    const percentage = (velocity / CONSTANTS.C) * 100;
    return percentage < 0.01 ? 
      `${(percentage * 100).toFixed(2)} basis points` : 
      `${percentage.toFixed(2)}%`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <h2 className="text-2xl font-bold mb-6 text-zinc-100">
        Solar System Brachistochrone Calculator <span className="text-base font-normal text-sky-400">{VERSION}</span>
      </h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Controls */}
        <div className="bg-zinc-800 p-4 rounded-lg shadow border border-zinc-700">
          <h2 className="text-xl font-semibold mb-4 text-zinc-200">Journey Parameters</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Origin
            </label>
            <select
              value={originPlanet}
              onChange={(e) => setOriginPlanet(e.target.value)}
              className="block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            >
              {PLANET_ORDER.map(planet => (
                <option key={`origin-${planet}`} value={planet}>
                  {planet}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Destination
            </label>
            <select
              value={destinationPlanet}
              onChange={(e) => setDestinationPlanet(e.target.value)}
              className="block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            >
              {PLANET_ORDER.map(planet => (
                <option key={`dest-${planet}`} value={planet}>
                  {planet}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Acceleration: {gValue.toFixed(2)}g ({(acceleration * 100).toFixed(2)} cm/s²)
            </label>
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setPresetAcceleration("1/3g")}
                className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  Math.abs(gValue - 0.33) < 0.01 ? 'bg-sky-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                1/3 g
              </button>
              <button 
                onClick={() => setPresetAcceleration("1g")}
                className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  Math.abs(gValue - 1) < 0.01 ? 'bg-sky-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                1 g
              </button>
            </div>
            <input
              type="range"
              min={0.1}
              max={20}
              step={0.1}
              value={gValue}
              onChange={handleAccelerationChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>0.1g</span>
              <span>20g</span>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {showMatrix ? "Hide All Routes" : "Show All Routes"}
            </button>
          </div>
        </div>
        
        {/* Results Display */}
        <div className="bg-zinc-800 p-4 rounded-lg shadow border border-zinc-700">
          <h2 className="text-xl font-semibold mb-4 text-zinc-200">Journey Results</h2>
          
          {originPlanet === destinationPlanet ? (
            <div className="text-yellow-500 font-medium">
              Origin and destination cannot be the same planet.
            </div>
          ) : results ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-700 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-zinc-400">Min Travel Time</h3>
                  <p className="text-xl font-bold text-sky-400">{daysToDhm(results.minTime)}</p>
                </div>
                
                <div className="bg-zinc-700 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-zinc-400">Max Travel Time</h3>
                  <p className="text-xl font-bold text-sky-400">{daysToDhm(results.maxTime)}</p>
                </div>
              </div>
              
              <div className="border-t border-zinc-700 pt-3">
                <h3 className="font-medium text-zinc-300 mb-2">Journey Details</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Acceleration:</span>
                    <span className="font-medium text-zinc-200">{(acceleration * 100).toFixed(2)} cm/s²</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Minimum Distance:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.minDistanceKm)} km ({results.minDistance.toFixed(3)} AU)</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Maximum Distance:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.maxDistanceKm)} km ({results.maxDistance.toFixed(3)} AU)</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Median Travel Time:</span>
                    <span className="font-medium text-zinc-200">{daysToDhm(results.medianTime)}</span>
                  </li>
                </ul>
              </div>
              
              <div className="border-t border-zinc-700 pt-3">
                <h3 className="font-medium text-zinc-300 mb-2">Delta-V Requirements</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Minimum Delta-V:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.minDeltaV)} km/s</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Maximum Delta-V:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.maxDeltaV)} km/s</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Max Velocity (min):</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.minVelocity)} km/s ({formatLightspeedPercentage(results.minVelocity)} c)</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Max Velocity (max):</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.maxVelocity)} km/s ({formatLightspeedPercentage(results.maxVelocity)} c)</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-zinc-400">
              Select origin and destination planets to calculate journey times.
            </div>
          )}
        </div>
      </div>
      
      {/* Matrix Display (Sorted by Delta-V) */}
      {showMatrix && (
        <div className="mt-6 bg-zinc-800 p-4 rounded-lg shadow border border-zinc-700 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4 text-zinc-200">All Routes (Sorted by Delta-V)</h2>
          
          <table className="min-w-full divide-y divide-zinc-700">
            <thead className="bg-zinc-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Route</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Min Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Max Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Min Delta-V</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Max Delta-V</th>
              </tr>
            </thead>
            <tbody className="bg-zinc-800 divide-y divide-zinc-700">
              {matrixData.map((route, index) => (
                <tr key={index} className={originPlanet === route.origin && destinationPlanet === route.destination ? "bg-zinc-700" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-200">
                    {route.origin} → {route.destination}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {daysToDhm(route.minTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {daysToDhm(route.maxTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {formatNumber(route.minDeltaV)} km/s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {formatNumber(route.maxDeltaV)} km/s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-6 text-sm text-zinc-400">
        <p>Based on brachistochrone trajectory calculations. All flights assume continuous acceleration to midpoint, then continuous deceleration.</p>
      </div>
    </div>
  );
};

export default BrachistochroneCalculator;
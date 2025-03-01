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

// G-force health status thresholds
const G_FORCE_THRESHOLDS = [
  { threshold: 16, message: "Red goo.", color: "bg-red-500" },
  { threshold: 10, message: "Sustained 10g even with G-Juice likely deadly.", color: "bg-orange-500" },
  { threshold: 1.5, message: "Dangerous to human health.", color: "bg-yellow-500" },
  { threshold: 0, message: "Safe for human travel.", color: "text-green-500" }
];

const BrachistochroneCalc = () => {
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

  // Get the appropriate health status based on g-force level
  const getHealthStatus = (gForce) => {
    for (const status of G_FORCE_THRESHOLDS) {
      if (gForce >= status.threshold) {
        return status;
      }
    }
    return G_FORCE_THRESHOLDS[G_FORCE_THRESHOLDS.length - 1];
  };

  const healthStatus = getHealthStatus(gValue);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
      <div className="p-6">
        {/* Header */}
        <h2 className="text-2xl text-zinc-100 mb-6 flex items-center gap-2">
          Brachistochrone Calculator
          <span className="text-base font-normal text-sky-400">{VERSION}</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Left Column - Input Controls */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-zinc-200">Journey Parameters</h3>
            
            {/* Origin Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Origin</label>
              <select
                value={originPlanet}
                onChange={(e) => setOriginPlanet(e.target.value)}
                className="block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              >
                {PLANET_ORDER.map(planet => (
                  <option key={`origin-${planet}`} value={planet}>{planet}</option>
                ))}
              </select>
            </div>

            {/* Destination Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Destination</label>
              <select
                value={destinationPlanet}
                onChange={(e) => setDestinationPlanet(e.target.value)}
                className="block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              >
                {PLANET_ORDER.map(planet => (
                  <option key={`dest-${planet}`} value={planet}>{planet}</option>
                ))}
              </select>
            </div>

            {/* Acceleration Control */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Acceleration: {gValue.toFixed(2)}g ({(acceleration * 1000).toFixed(2)} m/s²)
              </label>
              
              {/* Health Status Banner */}
              <div className={`mt-1 mb-3 p-2 ${healthStatus.color} text-white text-sm font-medium rounded-md shadow`}>
                <div className="flex items-center">
                  {gValue >= 16 && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {healthStatus.message}
                </div>
              </div>

              {/* Acceleration Presets */}
              <div className="flex gap-2 mb-2">
                <button 
                  onClick={() => setPresetAcceleration("1/3g")}
                  className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    Math.abs(gValue - 0.33) < 0.01 ? 'bg-sky-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  1/3 g
                </button>
                <button 
                  onClick={() => setPresetAcceleration("1g")}
                  className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    Math.abs(gValue - 1) < 0.01 ? 'bg-sky-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  1 g
                </button>
              </div>

              {/* Acceleration Slider */}
              <input
                type="range"
                min={0.1}
                max={20}
                step={0.1}
                value={gValue}
                onChange={handleAccelerationChange}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />

              {/* G-force threshold markers */}
              <div className="relative w-full h-1 mt-1">
                <div className="absolute left-0 right-0 flex justify-between">
                  <span className="text-xs text-zinc-500">0.1g</span>
                  <span className="absolute left-[7%] w-1 h-3 bg-yellow-500" title="1.5g - Dangerous to human health"></span>
                  <span className="absolute left-[50%] w-1 h-3 bg-orange-500" title="10g - Likely deadly"></span>
                  <span className="absolute left-[80%] w-1 h-3 bg-red-500" title="16g - Red goo"></span>
                  <span className="text-xs text-zinc-500">20g</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {showMatrix ? "Hide All Routes" : "Show All Routes"}
            </button>
          </div>

          {/* Right Column - Results Display */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-zinc-200">Journey Results</h3>
            
            {originPlanet === destinationPlanet ? (
              <div className="text-yellow-500 font-medium">
                Origin and destination cannot be the same planet.
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* Travel Time Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-400">Min Travel Time</h4>
                    <p className="text-xl font-bold text-sky-400">{daysToDhm(results.minTime)}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-400">Max Travel Time</h4>
                    <p className="text-xl font-bold text-sky-400">{daysToDhm(results.maxTime)}</p>
                  </div>
                </div>

                {/* Journey Details */}
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium text-zinc-300 mb-2">Journey Details</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Acceleration:</span>
                      <span className="font-medium text-zinc-200">{(acceleration * 1000).toFixed(2)} m/s²</span>
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

                {/* Delta-v Requirements */}
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium text-zinc-300 mb-2">Delta-v Requirements</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Minimum Delta-v:</span>
                      <span className="font-medium text-zinc-200">{formatNumber(results.minDeltaV)} km/s</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Maximum Delta-v:</span>
                      <span className="font-medium text-zinc-200">{formatNumber(results.maxDeltaV)} km/s</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Min Max Velocity:</span>
                      <span className="font-medium text-zinc-200">{formatNumber(results.minVelocity)} km/s ({formatLightspeedPercentage(results.minVelocity)} c)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Max Max Velocity:</span>
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

        {/* Matrix Display */}
        {showMatrix && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-zinc-200">All Routes (Sorted by Delta-v)</h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-700">
              <table className="min-w-full divide-y divide-zinc-700">
                <thead className="bg-zinc-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Route</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Min Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Max Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Min Delta-v</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Max Delta-v</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900 divide-y divide-zinc-800">
                  {matrixData.map((route, index) => (
                    <tr key={index} className={originPlanet === route.origin && destinationPlanet === route.destination ? "bg-zinc-800" : ""}>
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
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-xs text-zinc-400 text-right">
          <a 
            href="https://github.com/jveigel/interstellar-brachistochrone-calculators" 
            className="hover:text-sky-300" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Source Code
          </a>
        </div>
      </div>
    </div>
  );
};

export default BrachistochroneCalc;
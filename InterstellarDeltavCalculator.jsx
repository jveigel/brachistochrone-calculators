import React, { useState, useEffect } from 'react';

const VERSION = "v0.1";

// Physical constants
const CONSTANTS = {
  LY_TO_KM: 9.461e12, // kilometers per light-year
  C: 299792.458, // Speed of light in km/s
  G: 9.81, // Earth gravity in m/s²
  G_TO_LY_PER_YEAR_SQUARED: 1.03, // Conversion factor from g to ly/year²
};

// Project Hail Mary parameters
const HAIL_MARY = {
  ACCELERATION_G: 1.5,
  MISSION_YEARS: 4,
  DELTA_V: 6 * 299792.458, // 6c in km/s
};

// Nearby star data (distance in light-years)
const STARS = {
  'Proxima Centauri': { distance: 4.246 },
  'Alpha Centauri': { distance: 4.37 },
  'Barnard\'s Star': { distance: 5.96 },
  'Wolf 359': { distance: 7.86 },
  'Lalande 21185': { distance: 8.29 },
  'Sirius': { distance: 8.58 },
  'Luyten 726-8': { distance: 8.73 },
  'Ross 154': { distance: 9.69 },
  'Ross 248': { distance: 10.32 },
  'Epsilon Eridani': { distance: 10.52 },
  'Lacaille 9352': { distance: 10.74 },
  'Ross 128': { distance: 11.01 },
  'EZ Aquarii': { distance: 11.27 },
  'Procyon': { distance: 11.46 },
  'Tau Ceti': { distance: 11.91 }
};

// Star order for display
const STAR_ORDER = [
  'Proxima Centauri', 'Alpha Centauri', 'Barnard\'s Star', 
  'Wolf 359', 'Lalande 21185', 'Sirius', 'Luyten 726-8', 
  'Ross 154', 'Ross 248', 'Epsilon Eridani', 'Lacaille 9352',
  'Ross 128', 'EZ Aquarii', 'Procyon', 'Tau Ceti'
];

const InterstellarDeltavCalculator = () => {
  const [selectedStar, setSelectedStar] = useState('Tau Ceti');
  const [deltaV, setDeltaV] = useState(72000); // Default to 72,000 km/s
  const [results, setResults] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [showMatrix, setShowMatrix] = useState(false);

  // Helper function to format years
  const formatYears = (years) => {
    const y = Math.floor(years);
    const months = Math.floor((years - y) * 12);
    return years < 1 ? `${months} months` : `${y} years, ${months} months`;
  };

  const formatNumber = (number, decimals = 0) => {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Calculate maximum velocity from delta-v
  const getMaxVelocity = (dv) => dv / 2;

  // Calculate travel time with fixed delta-v
  const calculateTravelTime = (distanceKm, dv) => {
    const maxVelocity = getMaxVelocity(dv); // km/s
    
    // Use a constant acceleration scaled based on the delta-v
    // For 72,000 km/s delta-v, we use 0.0014 km/s² to get ~100 years to Tau Ceti
    const baseAcceleration = 0.0014; // km/s² at 72,000 km/s delta-v
    const scaleFactor = dv / 72000;
    const acceleration = baseAcceleration * scaleFactor; 
    
    // Time to reach max velocity (t = v/a)
    const accelerationTime = maxVelocity / acceleration;
    
    // Distance covered during acceleration
    const accelerationDistance = 0.5 * acceleration * Math.pow(accelerationTime, 2);
    
    // If we can't reach max velocity in half the distance
    if (accelerationDistance > distanceKm / 2) {
      // We accelerate for half the distance, then decelerate
      const timeHalf = Math.sqrt(distanceKm / (2 * acceleration));
      return 2 * timeHalf;
    }
    
    // Using the formula: T = ((D - (A * t²)) / (A * t)) + (2*t)
    // where t is acceleration phase duration, A is acceleration, D is distance
    
    // Distance covered at constant max velocity (coast phase)
    const coastingDistance = distanceKm - (2 * accelerationDistance);
    
    // Time spent coasting: (D - (A * t²)) / (A * t)
    const coastingTime = coastingDistance / maxVelocity;
    
    // Total time: coast time + 2*acceleration time
    return coastingTime + (2 * accelerationTime);
  };

  // Calculate relativistic travel time 
  const calculateRelativisticTravelTime = (distanceKm, dv) => {
    const c = CONSTANTS.C;
    
    // For high delta-v values (like Hail Mary mode), we calculate based on constant proper acceleration
    const isHighDeltaV = dv > c;
    
    let effectiveMaxVelocity;
    let gamma;
    let acceleration;
    
    if (isHighDeltaV) {
      // For Project Hail Mary mode, we use constant proper acceleration of 1.5g
      acceleration = HAIL_MARY.ACCELERATION_G * CONSTANTS.G / 1000; // Convert to km/s²
      
      // For constant proper acceleration, the proper time τ (ship time) for each phase is:
      // τ = (c/a) * arcsinh(aT/c) where T is coordinate time
      // The distance covered in coordinate time T is:
      // x = (c²/a) * (sqrt(1 + (aT/c)²) - 1)
      
      // We need to solve for T given the total distance
      // For a complete journey (accelerate + decelerate), the total distance is:
      // D = 2 * (c²/a) * (sqrt(1 + (aT/c)²) - 1)
      // Solving for T:
      // T = (c/a) * sqrt((1 + aD/(2c²))² - 1)
      
      const D = distanceKm;
      const coordinateTimeHalf = (c/acceleration) * Math.sqrt(Math.pow(1 + acceleration * D/(2*c*c), 2) - 1);
      const properTimeHalf = (c/acceleration) * Math.asinh(acceleration * coordinateTimeHalf/c);
      
      // Calculate beta and gamma at turnover point
      const beta = Math.tanh(acceleration * properTimeHalf/c);
      effectiveMaxVelocity = beta * c;
      gamma = 1 / Math.sqrt(1 - beta * beta);
      
      // Total times (multiply by 2 for complete journey)
      const totalShipTime = 2 * properTimeHalf;
      const totalEarthTime = 2 * coordinateTimeHalf;
      
      return {
        shipYears: totalShipTime / (365.25 * 24 * 3600),
        earthYears: totalEarthTime / (365.25 * 24 * 3600),
        beta: beta,
        gamma: gamma,
        accelerationYears: properTimeHalf / (365.25 * 24 * 3600),
        coastYears: 0 // No coasting in Hail Mary mode
      };
    } else {
      // Original calculation for lower velocities
      effectiveMaxVelocity = Math.min(dv / 2, 0.999 * c);
      const beta = effectiveMaxVelocity / c;
      gamma = 1 / Math.sqrt(1 - Math.pow(beta, 2));
      
      // Calculate based on the same acceleration as the classical case
      const baseAcceleration = 0.0014; // km/s² at 72,000 km/s delta-v
      const scaleFactor = dv / 72000;
      acceleration = baseAcceleration * scaleFactor;
      
      // Rest of the calculation remains similar but uses the new effectiveMaxVelocity
      const accelerationTime = effectiveMaxVelocity / acceleration;
      const accelerationDistance = 0.5 * acceleration * Math.pow(accelerationTime, 2);
      
      if (2 * accelerationDistance > distanceKm) {
        const classicalTime = calculateTravelTime(distanceKm, dv);
        const shipYears = classicalTime / (gamma * 365.25 * 24 * 3600);
        const earthYears = classicalTime / (365.25 * 24 * 3600);
        return { 
          shipYears, 
          earthYears, 
          beta: effectiveMaxVelocity / c, 
          gamma,
          accelerationYears: shipYears / 2,
          coastYears: 0
        };
      }
      
      const coastDistance = distanceKm - (2 * accelerationDistance);
      const accelTime = 2 * accelerationTime;
      const coastTimeClassical = coastDistance / effectiveMaxVelocity;
      const coastTimeShip = coastTimeClassical / gamma;
      
      const totalShipSeconds = accelTime + coastTimeShip;
      const shipYears = totalShipSeconds / (365.25 * 24 * 3600);
      
      const totalEarthSeconds = accelTime + coastTimeClassical;
      const earthYears = totalEarthSeconds / (365.25 * 24 * 3600);
      
      const accelerationYears = accelerationTime / (365.25 * 24 * 3600);
      const coastYears = coastTimeShip / (365.25 * 24 * 3600);
      
      return {
        shipYears,
        earthYears,
        beta: effectiveMaxVelocity / c,
        gamma,
        accelerationYears,
        coastYears
      };
    }
  };

  // Update results when values change
  useEffect(() => {
    // Calculate metrics for selected star
    const calculateStarMetrics = (star, dv) => {
      const distanceLy = STARS[star].distance;
      const distanceKm = distanceLy * CONSTANTS.LY_TO_KM;
      
      // Relativistic effects
      const relativistic = calculateRelativisticTravelTime(distanceKm, dv);
      const maxVelocity = getMaxVelocity(dv);
      const lightSpeedPercentage = (maxVelocity / CONSTANTS.C) * 100;
      
      return {
        star,
        distanceLy,
        distanceKm,
        shipYears: relativistic.shipYears,
        earthYears: relativistic.earthYears,
        gamma: relativistic.gamma,
        lightSpeedPercentage,
        maxVelocity,
        accelerationYears: relativistic.accelerationYears,
        coastYears: relativistic.coastYears
      };
    };
    
    // Calculate for selected star
    const metrics = calculateStarMetrics(selectedStar, deltaV);
    setResults(metrics);
    
    // Calculate for all stars
    const allMetrics = STAR_ORDER.map(star => calculateStarMetrics(star, deltaV))
      .sort((a, b) => a.shipYears - b.shipYears);
    
    setAllResults(allMetrics);
  }, [selectedStar, deltaV]);

  // Handle delta-v slider change
  const handleDeltaVChange = (e) => {
    setDeltaV(Number(e.target.value));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
      <div className="p-6">
        <h2 className="text-2xl text-zinc-100 mb-6 flex items-baseline gap-2">
          Interstellar Delta-v Calculator
          <span className="text-sm font-normal text-sky-400">{VERSION}</span>
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Parameters */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-zinc-200">Parameters</h3>
            
            {/* Target Star Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Select Target Star
              </label>
              <select
                value={selectedStar}
                onChange={(e) => setSelectedStar(e.target.value)}
                className="block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              >
                {STAR_ORDER.map(star => (
                  <option key={star} value={star}>
                    {star} ({STARS[star].distance.toFixed(2)} ly)
                  </option>
                ))}
              </select>
            </div>
            
            {/* Delta-V Control */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Delta-v: {formatNumber(deltaV)} km/s ({(getMaxVelocity(deltaV) / CONSTANTS.C * 100).toFixed(2)}% of light speed)
              </label>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={deltaV}
                onChange={handleDeltaVChange}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500 mb-1.5"
              />
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-zinc-500">1,000 km/s</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDeltaV(72000)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    Reset to 72,000 km/s
                  </button>
                  <button 
                    onClick={() => setDeltaV(HAIL_MARY.DELTA_V)}
                    className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 ${
                      deltaV === HAIL_MARY.DELTA_V 
                        ? 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500' 
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:ring-sky-500'
                    }`}
                    title={`${HAIL_MARY.ACCELERATION_G}g for ${HAIL_MARY.MISSION_YEARS} years = ${HAIL_MARY.DELTA_V.toFixed(0)} km/s. The ship doesn't actually go 3x the speed of light, but it does use that much Delta-v. I make no guarantees about the accuracy of this calculation.`}
                  >
                    Project Hail Mary Mode
                  </button>
                </div>
                <span className="text-xs text-zinc-500">200,000 km/s</span>
              </div>
            </div>
            
            {/* Flight Profile Card */}
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Flight Profile</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-zinc-400">Max velocity:</span>
                  <span className="font-medium text-zinc-200">{formatNumber(getMaxVelocity(deltaV))} km/s</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-zinc-400">Flight plan:</span>
                  <span className="font-medium text-zinc-200">
                    {results?.coastYears === 0 ? 'Accelerate → Decelerate' : 'Accelerate → Cruise → Decelerate'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-zinc-400">% of light speed:</span>
                  <span className="font-medium text-zinc-200">{(getMaxVelocity(deltaV) / CONSTANTS.C * 100).toFixed(2)}%</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="w-full px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {showMatrix ? "Hide All Routes" : "Show All Routes"}
            </button>
          </div>

          {/* Right Column - Results */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-zinc-200">Trip to {selectedStar}</h3>
            
            {results && (
              <div className="space-y-4">
                {/* Time Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-400">Ship Time</h4>
                    <p className="text-xl font-bold text-sky-400">{formatYears(results.shipYears)}</p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-400">Earth Time</h4>
                    <p className="text-xl font-bold text-sky-400">{formatYears(results.earthYears)}</p>
                  </div>
                </div>

                {/* Journey Details */}
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium text-zinc-300 mb-2">Journey Details</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Distance:</span>
                      <span className="font-medium text-zinc-200">{results.distanceLy.toFixed(2)} light-years</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Maximum velocity:</span>
                      <span className="font-medium text-zinc-200">{formatNumber(results.maxVelocity)} km/s</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Time dilation:</span>
                      <span className="font-medium text-zinc-200">{results.gamma.toFixed(2)}x</span>
                    </li>
                  </ul>
                </div>

                {/* Journey Phases */}
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium text-zinc-300 mb-2">Journey Phases</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Acceleration phase:</span>
                      <span className="font-medium text-zinc-200">{formatYears(results.accelerationYears)} × 2</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Coast phase:</span>
                      <span className="font-medium text-zinc-200">{formatYears(results.coastYears)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Phase ratio:</span>
                      <span className="font-medium text-zinc-200">
                        {Math.round((results.coastYears / results.shipYears) * 100)}% coasting
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Matrix Display */}
        {showMatrix && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4 text-zinc-200">All Destinations (Sorted by Travel Time)</h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-700">
              <table className="min-w-full divide-y divide-zinc-700">
                <thead className="bg-zinc-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Star</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Distance (ly)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Ship Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Earth Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Time Dilation</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900 divide-y divide-zinc-800">
                  {allResults.map((result) => (
                    <tr key={result.star} className={selectedStar === result.star ? "bg-zinc-800" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-200">{result.star}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">{result.distanceLy.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">{formatYears(result.shipYears)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">{formatYears(result.earthYears)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">{result.gamma.toFixed(2)}x</td>
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

export default InterstellarDeltavCalculator;
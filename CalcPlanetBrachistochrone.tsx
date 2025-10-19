"use client";

import React, { useState, useEffect } from "react";

const VERSION = "v0.2";

interface Planet {
  perihelion: number;
  aphelion: number;
}

interface Planets {
  [key: string]: Planet;
}

interface Results {
  minDistance: number;
  maxDistance: number;
  minDistanceKm: number;
  maxDistanceKm: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  minDeltaV: number;
  maxDeltaV: number;
  minVelocity: number;
  maxVelocity: number;
}

interface MatrixEntry {
  origin: string;
  destination: string;
  minTime: number;
  maxTime: number;
  minDeltaV: number;
  maxDeltaV: number;
}

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
  Mercury: { perihelion: 0.307, aphelion: 0.467 },
  Venus: { perihelion: 0.718, aphelion: 0.728 },
  Earth: { perihelion: 0.983, aphelion: 1.017 },
  Mars: { perihelion: 1.381, aphelion: 1.666 },
  Ceres: { perihelion: 2.5518, aphelion: 2.9775 },
  Jupiter: { perihelion: 4.95, aphelion: 5.457 },
  Saturn: { perihelion: 9.041, aphelion: 10.124 },
  Uranus: { perihelion: 18.375, aphelion: 20.063 },
  Neptune: { perihelion: 29.767, aphelion: 30.441 },
};

// Planet order for display in dropdowns
const PLANET_ORDER = ["Mercury", "Venus", "Earth", "Mars", "Ceres", "Jupiter", "Saturn", "Uranus", "Neptune"];

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
    maximumFractionDigits: decimals,
  });
};

// G-force health status thresholds
const G_FORCE_THRESHOLDS = [
  {
    threshold: 18,
    message: "You've got 10 seconds of consciousness. Then about 4 minutes till brain death.",
    color: "bg-red-500",
  },
  { threshold: 10, message: "Sustained 10g+ (even with G-Juice) is not advisable.", color: "bg-orange-500" },
  { threshold: 1.5, message: "Dangerous to human health.", color: "bg-yellow-500" },
  { threshold: 0, message: "Safe for human travel.", color: "text-green-500" },
];

const BrachistochroneCalc = () => {
  const [originPlanet, setOriginPlanet] = useState<string>("Earth");
  const [destinationPlanet, setDestinationPlanet] = useState<string>("Mars");
  const [acceleration, setAcceleration] = useState<number>(CONSTANTS.G_1_3);
  const [gValue, setGValue] = useState<number>(0.33); // Store g value separately
  const [results, setResults] = useState<Results | null>(null);
  const [showMatrix, setShowMatrix] = useState<boolean>(false);
  const [matrixData, setMatrixData] = useState<MatrixEntry[]>([]);

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

    if (Math.abs(r1 - 1) < 0.1) {
      // If origin is Earth's orbit
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
    const medianTime = calculateBrachistochroneTime(medianDist * CONSTANTS.AU_TO_KM, acceleration);

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
      maxVelocity,
    };
  };

  // Generate the travel time matrix for all planets
  const generateMatrix = () => {
    const matrix: MatrixEntry[] = [];

    for (let i = 0; i < PLANET_ORDER.length; i++) {
      for (let j = i + 1; j < PLANET_ORDER.length; j++) {
        const origin = PLANET_ORDER[i];
        const destination = PLANET_ORDER[j];

        const metrics = calculateMetrics(PLANETS[origin], PLANETS[destination], acceleration);

        matrix.push({
          origin,
          destination,
          minTime: metrics.minTime,
          maxTime: metrics.maxTime,
          minDeltaV: metrics.minDeltaV,
          maxDeltaV: metrics.maxDeltaV,
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

    const metrics = calculateMetrics(PLANETS[originPlanet], PLANETS[destinationPlanet], acceleration);

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
    return percentage < 0.01 ? `${(percentage * 100).toFixed(2)} basis points` : `${percentage.toFixed(2)}%`;
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
    <div className="max-w-none rounded-sm border border-zinc-800 bg-zinc-900 shadow-lg">
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-baseline gap-2">
          <h2 className="text-2xl text-zinc-100">Planet Brachistochrone Calculator</h2>
          <span className="text-sm font-normal text-TOElightblue">{VERSION}</span>
        </div>

        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {/* Left Column - Input Controls */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-zinc-200">Journey Parameters</h3>

            {/* Origin Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Origin</label>
              <select
                value={originPlanet}
                onChange={(e) => setOriginPlanet(e.target.value)}
                className="block w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-200 shadow-sm focus:border-TOElightblue focus:ring-1 focus:ring-TOElightblue focus:outline-none"
              >
                {PLANET_ORDER.map((planet) => (
                  <option key={`origin-${planet}`} value={planet}>
                    {planet}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Destination</label>
              <select
                value={destinationPlanet}
                onChange={(e) => setDestinationPlanet(e.target.value)}
                className="block w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-200 shadow-sm focus:border-TOElightblue focus:ring-1 focus:ring-TOElightblue focus:outline-none"
              >
                {PLANET_ORDER.map((planet) => (
                  <option key={`dest-${planet}`} value={planet}>
                    {planet}
                  </option>
                ))}
              </select>
            </div>

            {/* Acceleration Control */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Acceleration: {gValue.toFixed(2)}g ({(acceleration * 1000).toFixed(2)} m/s²)
              </label>

              {/* Health Status Banner */}
              <div className={`mt-1 mb-3 p-2 ${healthStatus.color} rounded-md text-sm font-medium text-white shadow`}>
                <div className="flex items-center">
                  {gValue >= 18 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {healthStatus.message}
                </div>
              </div>

              {/* Acceleration Presets */}
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => setPresetAcceleration("1/3g")}
                  className={`rounded-md px-3 py-1 text-xs font-medium focus:ring-2 focus:ring-TOElightblue focus:outline-none ${
                    Math.abs(gValue - 0.33) < 0.01
                      ? "bg-TOElightblue text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  1/3 g
                </button>
                <button
                  onClick={() => setPresetAcceleration("1g")}
                  className={`rounded-md px-3 py-1 text-xs font-medium focus:ring-2 focus:ring-TOElightblue focus:outline-none ${
                    Math.abs(gValue - 1) < 0.01
                      ? "bg-TOElightblue text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
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
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-TOElightblue"
              />

              {/* G-force threshold markers */}
              <div className="relative mt-1 h-1 w-full">
                <div className="absolute right-0 left-0 flex justify-between">
                  <span className="text-xs text-zinc-500">0.1g</span>
                  <span
                    className="absolute left-[7%] h-3 w-1 bg-yellow-500"
                    title="1.5g - Dangerous to human health"
                  ></span>
                  <span className="absolute left-[50%] h-3 w-1 bg-orange-500" title="10g - Not advisable"></span>
                  <span className="absolute left-[93%] h-3 w-1 bg-red-500" title="18g - Likely deadly"></span>
                  <span className="text-xs text-zinc-500">20g</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-600 focus:ring-2 focus:ring-zinc-500 focus:outline-none"
            >
              {showMatrix ? "Hide All Routes" : "Show All Routes"}
            </button>
          </div>

          {/* Right Column - Results Display */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-zinc-200">Journey Results</h3>

            {originPlanet === destinationPlanet ? (
              <div className="font-medium text-yellow-500">Origin and destination cannot be the same planet.</div>
            ) : results ? (
              <div className="space-y-6">
                {/* Travel Time Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-zinc-700 p-3">
                    <h4 className="text-sm font-medium text-zinc-400">Min Travel Time</h4>
                    <p className="text-xl font-bold text-TOElightblue">{daysToDhm(results.minTime)}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-700 p-3">
                    <h4 className="text-sm font-medium text-zinc-400">Max Travel Time</h4>
                    <p className="text-xl font-bold text-TOElightblue">{daysToDhm(results.maxTime)}</p>
                  </div>
                </div>

                {/* Journey Details */}
                <div className="rounded-lg bg-zinc-700 p-4">
                  <h4 className="mb-2 font-medium text-zinc-300">Journey Details</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Acceleration:</span>
                      <span className="font-medium text-zinc-200">{(acceleration * 1000).toFixed(2)} m/s²</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Minimum Distance:</span>
                      <span className="font-medium text-zinc-200">
                        {formatNumber(results.minDistanceKm)} km ({results.minDistance.toFixed(3)} AU)
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Maximum Distance:</span>
                      <span className="font-medium text-zinc-200">
                        {formatNumber(results.maxDistanceKm)} km ({results.maxDistance.toFixed(3)} AU)
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Median Travel Time:</span>
                      <span className="font-medium text-zinc-200">{daysToDhm(results.medianTime)}</span>
                    </li>
                  </ul>
                </div>

                {/* Delta-v Requirements */}
                <div className="rounded-lg bg-zinc-700 p-4">
                  <h4 className="mb-2 font-medium text-zinc-300">Delta-v Requirements</h4>
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
                      <span className="font-medium text-zinc-200">
                        {formatNumber(results.minVelocity)} km/s ({formatLightspeedPercentage(results.minVelocity)} c)
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Max Max Velocity:</span>
                      <span className="font-medium text-zinc-200">
                        {formatNumber(results.maxVelocity)} km/s ({formatLightspeedPercentage(results.maxVelocity)} c)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-zinc-400">Select origin and destination planets to calculate journey times.</div>
            )}
          </div>
        </div>

        {/* Matrix Display */}
        {showMatrix && (
          <div className="mt-8">
            <h3 className="mb-4 text-xl font-semibold text-zinc-200">All Routes (Sorted by Delta-v)</h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-700">
              <table className="min-w-full divide-y divide-zinc-700">
                <thead className="bg-zinc-800">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      Route
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      Min Time
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      Max Time
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      Min Delta-v
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      Max Delta-v
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                  {matrixData.map((route, index) => (
                    <tr
                      key={index}
                      className={
                        originPlanet === route.origin && destinationPlanet === route.destination ? "bg-zinc-800" : ""
                      }
                    >
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-zinc-200">
                        {route.origin} → {route.destination}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-300">{daysToDhm(route.minTime)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-300">{daysToDhm(route.maxTime)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-300">
                        {formatNumber(route.minDeltaV)} km/s
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-300">
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
        <div className="mt-6 text-right text-xs text-zinc-400">
          <a
            href="https://github.com/jveigel/interstellar-brachistochrone-calculators/blob/main/BrachistochroneCalc.jsx"
            className="hover:text-TOElightblue"
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

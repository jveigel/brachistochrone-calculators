import React, { useState, useEffect } from 'react';

// Physical constants
const C = 299792458; // Speed of light in m/s
const LY_TO_M = 9.461e15; // Light years to meters
const YEAR_TO_SECONDS = 365.25 * 24 * 3600;

// Define star systems with distances in light years
const STAR_SYSTEMS = [
  { name: "Tau Ceti", distance: 11.9 },
  { name: "Alpha Centauri", distance: 4.37 },
  { name: "Epsilon Eridani", distance: 10.5 },
  { name: "Barnard's Star", distance: 5.96 },
  { name: "Sirius", distance: 8.6 },
  { name: "Proxima Centauri", distance: 4.24 },
  { name: "Wolf 359", distance: 7.86 },
  { name: "Lalande 21185", distance: 8.29 }
];

// Original Nauvoo specifications
const NAUVOO_SPECS = {
  dryMass: 13500000, // kg (13,500 tons)
  thrust: 144e6, // N (144 MN)
  exhaustVelocity: 0.08 * C, // m/s (0.08c)
  efficiency: 0.0065, // 0.65%
  maxVelocity: 0.119 * C, // m/s (11.9% of c)
  star: STAR_SYSTEMS[0] // Tau Ceti
};

const VERSION = "v0.1";

const EpsteinDriveCalculator = () => {
  // Ship parameters
  const [dryMass, setDryMass] = useState(NAUVOO_SPECS.dryMass);
  const [thrust, setThrust] = useState(NAUVOO_SPECS.thrust);
  const [exhaustVelocity, setExhaustVelocity] = useState(NAUVOO_SPECS.exhaustVelocity);
  const [efficiency, setEfficiency] = useState(NAUVOO_SPECS.efficiency);
  const [maxVelocity, setMaxVelocity] = useState(NAUVOO_SPECS.maxVelocity);
  const [selectedStar, setSelectedStar] = useState(NAUVOO_SPECS.star);
  const [flightProfile, setFlightProfile] = useState('standard'); // 'standard' or 'brachistochrone'
  
  // Calculated results
  const [results, setResults] = useState(null);

  const formatNumber = (number, decimals = 1) => {
    return number.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatPower = (watts) => {
    if (watts >= 1e15) {
      return `${(watts/1e15).toFixed(1)} PW`;
    } else if (watts >= 1e12) {
      return `${(watts/1e12).toFixed(1)} TW`;
    } else {
      return `${(watts/1e9).toFixed(1)} GW`;
    }
  };

  const calculateResults = () => {
    const distance = selectedStar.distance * LY_TO_M;
    
    // Mass flow rate calculation
    const massFlowRate = thrust / exhaustVelocity;
    
    // Calculate acceleration
    const initialAcceleration = thrust / dryMass;
    
    // Power calculations
    const powerOutput = (thrust * exhaustVelocity) / 2;
    const theoreticalPower = massFlowRate * 3.52e14; // D-He3 fusion energy
    const actualEfficiency = Math.min((powerOutput / theoreticalPower) * 100, 100); // Cap at 100%
    
    if (flightProfile === 'standard') {
      // Standard flight profile: accelerate, coast, decelerate
      
      // Calculate time needed to reach cruise velocity
      const timeToVelocity = maxVelocity / initialAcceleration;
      
      // Calculate fuel needed for acceleration
      const fuelForAccel = massFlowRate * timeToVelocity;
      const totalFuelMass = 2 * fuelForAccel; // Double for deceleration
      
      // Calculate mass ratio
      const massRatio = (dryMass + totalFuelMass) / dryMass;
      
      // Calculate relativistic factors - ensure no NaN values
      const velocityRatio = maxVelocity / C;
      const gamma = velocityRatio >= 1 ? 
        Number.MAX_VALUE : 
        1 / Math.sqrt(1 - Math.pow(velocityRatio, 2));
      
      // Calculate journey times
      const accelerationDistance = 0.5 * initialAcceleration * Math.pow(timeToVelocity, 2);
      const coastDistance = Math.max(0, distance - (2 * accelerationDistance));
      const coastTime = coastDistance / maxVelocity;
      
      // Earth time (coordinate time)
      const earthTime = coastTime + (2 * timeToVelocity);
      
      // Ship time (proper time) - slower due to time dilation
      const shipTime = (coastTime/gamma) + (2 * timeToVelocity/gamma);
      
      setResults({
        flightProfile: 'standard',
        acceleration: initialAcceleration / 9.8, // in g
        accelerationTime: timeToVelocity / (24 * 3600), // days
        coastTime: coastTime / YEAR_TO_SECONDS, // years
        earthTime: earthTime / YEAR_TO_SECONDS, // years
        shipTime: shipTime / YEAR_TO_SECONDS, // years
        fuelMass: totalFuelMass / 1000, // tons
        massRatio: massRatio,
        peakVelocity: maxVelocity / C, // fraction of c
        gamma: gamma,
        powerOutput: powerOutput,
        theoreticalPower: theoreticalPower,
        massFlowRate: massFlowRate, // kg/s
        efficiency: actualEfficiency // percent, capped at 100%
      });
    } else {
      // True brachistochrone trajectory: continuous acceleration and deceleration
      
      // For relativistic brachistochrone, we need to account for relativistic effects
      // on acceleration and time
      
      // Maximum coordinate time for a relativistic brachistochrone trajectory:
      // t = (c/a) * (arccosh(ad/c² + 1))
      // where c is speed of light, a is proper acceleration, d is distance
      
      // Calculate relativistic values safely
      const halfDistance = distance / 2;
      const ac_ratio = (initialAcceleration * halfDistance) / (C * C);
      
      // Handle potential overflow with large values
      let timeToMidpoint;
      if (ac_ratio > 1e10) {
        // For extremely large values, use approximation
        timeToMidpoint = (C / initialAcceleration) * Math.log(2 * ac_ratio);
      } else {
        timeToMidpoint = (C / initialAcceleration) * Math.acosh(1 + ac_ratio);
      }
      
      // Earth time (coordinate time)
      const earthTime = 2 * timeToMidpoint; // Double for deceleration phase
      
      // Calculate peak velocity at midpoint (capped at c-epsilon)
      const velocityFactor = Math.tanh(initialAcceleration * timeToMidpoint / C);
      const peakVelocity = C * velocityFactor;
      
      // Calculate gamma at peak velocity
      const peakGamma = 1 / Math.sqrt(1 - velocityFactor * velocityFactor);
      
      // Calculate fuel needed
      const fuelForAccel = massFlowRate * timeToMidpoint;
      const totalFuelMass = 2 * fuelForAccel; // Double for deceleration
      
      // Calculate mass ratio
      const massRatio = (dryMass + totalFuelMass) / dryMass;
      
      // Calculate proper time (ship time) - slower due to time dilation
      // For brachistochrone trajectory, the proper time is:
      // τ = (2c/a) * sinh(at/2c)
      const shipTime = (2 * C / initialAcceleration) * Math.sinh(initialAcceleration * timeToMidpoint / (2 * C));
      
      setResults({
        flightProfile: 'brachistochrone',
        acceleration: initialAcceleration / 9.8, // in g
        accelerationTime: timeToMidpoint / (24 * 3600), // days for half-journey
        coastTime: 0, // No coasting in brachistochrone
        earthTime: earthTime / YEAR_TO_SECONDS, // years
        shipTime: shipTime / YEAR_TO_SECONDS, // years
        fuelMass: totalFuelMass / 1000, // tons
        massRatio: massRatio,
        peakVelocity: peakVelocity / C, // fraction of c
        gamma: peakGamma,
        powerOutput: powerOutput,
        theoreticalPower: theoreticalPower,
        massFlowRate: massFlowRate, // kg/s
        efficiency: actualEfficiency // percent, capped at 100%
      });
    }
  };

  // Recalculate when parameters change
  useEffect(() => {
    calculateResults();
  }, [dryMass, thrust, exhaustVelocity, efficiency, maxVelocity, selectedStar, flightProfile]);

  // Format values for display
  const dryMassKilotons = dryMass / 1000000;
  const dryMassTons = dryMass / 1000;
  const thrustMN = thrust / 1000000;
  const exhaustVelocityC = exhaustVelocity / C;
  const maxVelocityC = maxVelocity / C;

  // Reset to original Nauvoo specifications
  const resetToNauvooSpecs = () => {
    setDryMass(NAUVOO_SPECS.dryMass);
    setThrust(NAUVOO_SPECS.thrust);
    setExhaustVelocity(NAUVOO_SPECS.exhaustVelocity);
    setEfficiency(NAUVOO_SPECS.efficiency);
    setMaxVelocity(NAUVOO_SPECS.maxVelocity);
    setSelectedStar(NAUVOO_SPECS.star);
    setFlightProfile('standard');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-zinc-100">
        Epstein Drive Interstellar Calculator <span className="text-base font-normal text-sky-400">{VERSION}</span>
      </h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Controls */}
        <div className="bg-zinc-800 p-4 rounded-lg shadow border border-zinc-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-zinc-200">Ship Parameters</h2>
            <button 
              onClick={resetToNauvooSpecs}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Reset to Nauvoo Specs
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Dry Mass: {formatNumber(dryMassTons)} tons ({formatNumber(dryMassKilotons, 2)} kilotons)
            </label>
            <input
              type="range"
              min={1000000}
              max={100000000}
              step={1000000}
              value={dryMass}
              onChange={(e) => setDryMass(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Total Thrust: {formatNumber(thrustMN)} MN
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">1 MN</span>
              <input
                type="range"
                min={1000000}
                max={1000000000}
                step={1000000}
                value={thrust}
                onChange={(e) => setThrust(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-xs text-zinc-500">1,000 MN</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              (For reference: Saturn V ~35 MN, Falcon Heavy ~22 MN)
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Exhaust Velocity: {formatNumber(exhaustVelocityC * 100, 2)}% c
            </label>
            <input
              type="range"
              min={0.01 * C}
              max={0.15 * C}
              step={0.01 * C}
              value={exhaustVelocity}
              onChange={(e) => setExhaustVelocity(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Flight Profile
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-sky-600 bg-zinc-700 border-zinc-600"
                  checked={flightProfile === 'standard'}
                  onChange={() => setFlightProfile('standard')}
                />
                <span className="ml-2 text-zinc-300">Standard (Accel → Coast → Decel)</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-sky-600 bg-zinc-700 border-zinc-600"
                  checked={flightProfile === 'brachistochrone'}
                  onChange={() => setFlightProfile('brachistochrone')}
                />
                <span className="ml-2 text-zinc-300">Brachistochrone</span>
              </label>
            </div>
          </div>
          
          {flightProfile === 'standard' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Maximum Cruise Velocity: {formatNumber(maxVelocityC * 100, 2)}% of light speed
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">1%</span>
                <input
                  type="range"
                  min={0.01 * C}
                  max={0.95 * C}
                  step={0.05 * C}
                  value={maxVelocity}
                  onChange={(e) => setMaxVelocity(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <span className="text-xs text-zinc-500">95%</span>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Destination
            </label>
            <select
              value={selectedStar.name}
              onChange={(e) => setSelectedStar(STAR_SYSTEMS.find(s => s.name === e.target.value))}
              className="block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            >
              {STAR_SYSTEMS.map(star => (
                <option key={star.name} value={star.name}>
                  {star.name} ({star.distance} light years)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Results Display */}
        <div className="bg-zinc-800 p-4 rounded-lg shadow border border-zinc-700">
          <h2 className="text-xl font-semibold mb-4 text-zinc-200">Journey Results</h2>
          
          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-700 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-zinc-400">Earth Time</h3>
                  <p className="text-xl font-bold text-sky-400">{formatNumber(results.earthTime)} years</p>
                </div>
                
                <div className="bg-zinc-700 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-zinc-400">Ship Time</h3>
                  <p className="text-xl font-bold text-sky-400">{formatNumber(results.shipTime)} years</p>
                </div>
              </div>
              
              <div className="border-t border-zinc-700 pt-3">
                <h3 className="font-medium text-zinc-300 mb-2">Performance Details</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Acceleration:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.acceleration, 2)} g</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Flight Profile:</span>
                    <span className="font-medium text-zinc-200">
                      {results.flightProfile === 'standard' ? 'Standard' : 'Brachistochrone'}
                    </span>
                  </li>
                  {results.flightProfile === 'standard' ? (
                    <>
                      <li className="flex justify-between">
                        <span className="text-zinc-400">Acceleration Phase:</span>
                        <span className="font-medium text-zinc-200">{formatNumber(results.accelerationTime)} days</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-zinc-400">Coast Phase:</span>
                        <span className="font-medium text-zinc-200">{formatNumber(results.coastTime)} years</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex justify-between">
                      <span className="text-zinc-400">Acceleration Phase:</span>
                      <span className="font-medium text-zinc-200">{formatNumber(results.accelerationTime)} days (half journey)</span>
                    </li>
                  )}
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Time Dilation Factor:</span>
                    <span className="font-medium text-zinc-200">{results.gamma.toFixed(3)}</span>
                  </li>
                </ul>
              </div>
              
              <div className="border-t border-zinc-700 pt-3">
                <h3 className="font-medium text-zinc-300 mb-2">Fuel Requirements</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Fuel Mass:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.fuelMass)} tons</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Mass Ratio:</span>
                    <span className="font-medium text-zinc-200">{results.massRatio.toFixed(2)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Mass Flow Rate:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.massFlowRate, 1)} kg/s</span>
                  </li>
                </ul>
              </div>
              
              <div className="border-t border-zinc-700 pt-3">
                <h3 className="font-medium text-zinc-300 mb-2">Power Systems</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Power Output:</span>
                    <span className="font-medium text-zinc-200">{formatPower(results.powerOutput)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Theoretical Power:</span>
                    <span className="font-medium text-zinc-200">{formatPower(results.theoreticalPower)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Drive Efficiency:</span>
                    <span className="font-medium text-zinc-200">{formatNumber(results.efficiency, 3)}%</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 text-sm text-zinc-400">
        <p>Based on the Epstein Drive from The Expanse universe. Uses relativistic calculations for high-velocity travel.</p>
        <p className="mt-1"><strong>Note:</strong> The original Nauvoo specifications target 11.9% of light speed for a 100-year journey to Tau Ceti. At very high velocities (>80% of light speed), relativistic effects become extreme. With very low thrust values, travel times may become impractically long for interstellar journeys.</p>
      </div>
    </div>
  );
};

export default EpsteinDriveCalculator;
import React, { useState, useEffect } from 'react';

const VERSION = "v0.1";

const InterstellarRocketCalculator = () => {
  // Constants
  const SPEED_OF_LIGHT = 299792458;
  const SPEED_OF_LIGHT_SQUARED = 89875517873681760;
  const ASTRONOMICAL_UNIT = 149598000000;
  const LIGHT_MINUTE = 17987547480;
  const LIGHT_YEAR = 9460730472580800;
  const PARSEC = 30856780000000000;
  
  // Helper function for hyperbolic cosine
  const acosh = (arg) => {
    return Math.log(arg + Math.sqrt(arg * arg - 1));
  };
  
  // State
  const [fields, setFields] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [helpVisible, setHelpVisible] = useState({});
  
  // Define calculation functions
  const calcVelocity = (parameters) => {
    let observedTimeElapsed = parameters.observer_time_elapsed;
    if (observedTimeElapsed > parameters.observer_time / 2) {
      observedTimeElapsed = parameters.observer_time - observedTimeElapsed;
    }
    
    const observedTimeProportion = observedTimeElapsed / parameters.observer_time;
    const timeProportionSq = 1 / (observedTimeProportion * observedTimeProportion);
    
    const k = SPEED_OF_LIGHT_SQUARED / parameters.acceleration;
    const denominator = parameters.acceleration * parameters.observer_time * parameters.observer_time / timeProportionSq;
    const second_sqrt_term = k / denominator;
    const sqrt_term = 1 + second_sqrt_term;
    
    return SPEED_OF_LIGHT / Math.sqrt(sqrt_term);
  };
  
  const calcMaxVelocity = (parameters) => {
    const params = { ...parameters };
    params.observer_time_elapsed = params.observer_time / 2;
    return calcVelocity(params);
  };
  
  const calcDistance = (parameters) => {
    const calcDist = (observerTime, velocity) => {
      const numerator = SPEED_OF_LIGHT * velocity * observerTime;
      const lorentz = Math.sqrt(SPEED_OF_LIGHT_SQUARED - velocity * velocity);
      return numerator / (SPEED_OF_LIGHT + lorentz);
    };
    
    const params = { ...parameters };
    let result;
    
    if (params.observer_time_elapsed > params.observer_time / 2) {
      const totalDistance = calcDist(params.observer_time, calcMaxVelocity(params));
      params.observer_time_elapsed = params.observer_time - params.observer_time_elapsed;
      const velocity = calcVelocity(params);
      const subtractDistance = calcDist(params.observer_time_elapsed, velocity);
      result = totalDistance - subtractDistance;
    } else {
      result = calcDist(params.observer_time_elapsed, calcVelocity(params));
    }
    
    return result;
  };
  
  const calcTotalDistance = (parameters) => {
    const params = { ...parameters };
    params.observer_time_elapsed = params.observer_time;
    return calcDistance(params);
  };
  
  const calcAcceleration = (parameters) => {
    setErrorMessage("The acceleration is calculated using Newtonian equations and is inaccurate when velocity approaches speed of light. It is better to input the acceleration yourself.");
    
    if (parameters.distance && parameters.observer_time) {
      const distance = parameters.distance / 2;
      const time = parameters.observer_time / 2;
      return 2 * distance / (time * time);
    } else if (parameters.distance && parameters.max_velocity) {
      return (parameters.max_velocity * parameters.max_velocity) / parameters.distance;
    } else {
      return 2 * parameters.max_velocity / parameters.observer_time;
    }
  };
  
  const calcObserverTime = (parameters) => {
    const k = SPEED_OF_LIGHT_SQUARED / parameters.acceleration;
    const k_over_a = k / parameters.acceleration;
    let sqrt_term_operand = parameters.distance / (2 * k) + 1;
    sqrt_term_operand = sqrt_term_operand * sqrt_term_operand;
    const sqrt_term = k_over_a * (sqrt_term_operand - 1);
    
    return 2 * Math.sqrt(sqrt_term);
  };
  
  const calcTotalTravelerTime = (parameters) => {
    const k = SPEED_OF_LIGHT_SQUARED / parameters.acceleration;
    const acosh_result = acosh(parameters.distance / (2 * k) + 1);
    
    return 2 * SPEED_OF_LIGHT / parameters.acceleration * acosh_result;
  };
  
  const calcTravelerTime = (parameters) => {
    return parameters.observer_time_elapsed * 
      Math.sqrt(1 - parameters.velocity * parameters.velocity / SPEED_OF_LIGHT_SQUARED);
  };
  
  const calcEnergy = (parameters) => {
    const vel_over_c_sq = parameters.max_velocity * parameters.max_velocity / SPEED_OF_LIGHT_SQUARED;
    const sqrt_term = 1 - vel_over_c_sq;
    const denominator = Math.sqrt(sqrt_term);
    const energy_per_kg = 2 * SPEED_OF_LIGHT_SQUARED * ((1 / denominator) - 1);
    
    return parameters.spacecraft_mass * energy_per_kg;
  };
  
  const calcFuelConversionRate = (parameters) => {
    const vel_to_c = parameters.max_velocity / SPEED_OF_LIGHT;
    const per_kg_100percent = 2 * vel_to_c / (1 - vel_to_c);
    const perfect_efficient = per_kg_100percent * parameters.spacecraft_mass;
    
    return perfect_efficient / parameters.fuel_mass;
  };
  
  const calcFuelMass = (parameters) => {
    const vel_to_c = parameters.max_velocity / SPEED_OF_LIGHT;
    const per_kg_100percent = 2 * vel_to_c / (1 - vel_to_c);
    
    return per_kg_100percent * parameters.spacecraft_mass / parameters.fuel_conversion_rate;
  };
  
  const calcMinObserverLength = (parameters) => {
    const velocity_sq = parameters.max_velocity * parameters.max_velocity;
    
    return parameters.traveler_length * Math.sqrt(1 - velocity_sq / SPEED_OF_LIGHT_SQUARED);
  };
  
  const calcObserverLength = (parameters) => {
    const velocity_sq = parameters.velocity * parameters.velocity;
    
    return parameters.traveler_length * Math.sqrt(1 - velocity_sq / SPEED_OF_LIGHT_SQUARED);
  };
  
  const calcTravelerLength = (parameters) => {
    const velocity_sq = parameters.max_velocity * parameters.max_velocity;
    
    return parameters.observer_length / Math.sqrt(1 - velocity_sq / SPEED_OF_LIGHT_SQUARED);
  };
  
  // Define field definitions
  const fieldDefinitions = {
    distance: {
      lbl: "Distance",
      calc: calcTotalDistance,
      parameters: ["observer_time", "acceleration"],
      units: {
        "meters": 1,
        "kilometers": 1000,
        "light-seconds": SPEED_OF_LIGHT,
        "light-minutes": LIGHT_MINUTE,
        "astronomical unit": ASTRONOMICAL_UNIT,
        "light-years": LIGHT_YEAR,
        "parsec": PARSEC
      },
      ajaxValues: "distances",
      primary: true,
      min_val: 100,
      min_error: "This calculator is quite useless for such small distances. Try travel a bit further.",
      help_text: true,
      def_val: "11.2"
    },
    acceleration: {
      lbl: "Acceleration",
      calc: calcAcceleration,
      parameters: ["distance", "observer_time", "max_velocity"],
      max_missing: 1,
      units: {
        "m/s^2": 1,
        "g": 9.8
      },
      primary: true,
      min_value: 0.00000000000000001,
      min_error: "Distance too small.",
      max_val: SPEED_OF_LIGHT - 0.001,
      max_error: "Is your spaceship on steroids? You can't accelerate so quickly.",
      def_val: "9.8",
      help_text: true
    },
    max_velocity: {
      lbl: "Maximum velocity (Δv/2)",
      calc: calcMaxVelocity,
      parameters: ["acceleration", "observer_time"],
      units: {
        "kilometers per hour": 0.27777777777777777777,
        "meters per second": 1,
        "kilometers per second": 1000,
        "speed of light (c)": SPEED_OF_LIGHT
      },
      ajaxValues: "velocities",
      primary: false,
      min_val: 0.000000000000001,
      min_error: "Your velocity is too small. At this rate you won't get out your front door.",
      max_val: SPEED_OF_LIGHT - 0.001,
      max_error: "You have been watching too much Star Trek. Velocity must be less than the speed of light.",
      help_text: true
    },
    observer_time: {
      lbl: "Observer time elapsed",
      calc: calcObserverTime,
      parameters: ["acceleration", "distance"],
      units: {
        "seconds": 1,
        "minutes": 60,
        "hours": 3600,
        "days": 86400,
        "months": 2629800,
        "years": 31557600
      },
      primary: false,
      help_text: true
    },
    traveler_time: {
      lbl: "Ship time elapsed",
      calc: calcTotalTravelerTime,
      parameters: ["acceleration", "distance"],
      units: {
        "seconds": 1,
        "minutes": 60,
        "hours": 3600,
        "days": 86400,
        "months": 2629800,
        "years": 31557600
      },
      primary: false,
      help_text: true
    },
    spacecraft_mass: {
      lbl: "Ship Dry Mass",
      calc: null,
      units: {
        "grams": 0.001,
        "kilograms": 1,
        "tons": 1000
      },
      primary: true,
      def_val: "25000",
      help_text: true
    },
    fuel_mass: {
      lbl: "Wet Mass (Fuel Mass)",
      calc: calcFuelMass,
      parameters: ["max_velocity", "spacecraft_mass", "fuel_conversion_rate"],
      units: {
        "kg": 1,
        "tons": 1000
      },
      primary: false,
      help_text: true
    },
    fuel_conversion_rate: {
      lbl: "Fuel conversion rate",
      calc: calcFuelConversionRate,
      parameters: ["max_velocity", "spacecraft_mass", "fuel_mass"],
      units: {
        "kg x m x m": 1
      },
      ajaxValues: "fuelrates",
      primary: true,
      def_val: "0.008",
      help_text: true
    },
    traveler_length: {
      lbl: "Length of spacecraft at start",
      calc: calcTravelerLength,
      parameters: ["observer_length", "max_velocity"],
      units: {
        "meters": 1,
        "millimeters": 1/100,
        "centimeters": 1/10,
        "kilometers": 1000
      },
      primary: true,
      def_val: "100",
      help_text: true
    },
    observer_length: {
      lbl: "Shortest spacecraft length for observer",
      calc: calcMinObserverLength,
      parameters: ["traveler_length", "max_velocity"],
      units: {
        "meters": 1,
        "millimeters": 1/100,
        "centimeters": 1/10,
        "kilometers": 1000
      },
      primary: false,
      help_text: true
    }
  };
  
  // Initialize fields on component mount
  useEffect(() => {
    initializeFields();
  }, []);
  
  // Modified initializeFields function to set specific default units
const initializeFields = () => {
  const initialFields = {};
  const initialHelpVisible = {};
  
  // Define default units for each field
  const defaultUnits = {
    distance: "light-years",
    acceleration: "m/s^2",  // keeping the same
    max_velocity: "speed of light (c)", 
    observer_time: "years",
    traveler_time: "years",
    spacecraft_mass: "tons",
    fuel_conversion_rate: "kg x m x m", // keeping the same
    fuel_mass: "tons",
    traveler_length: "meters", // keeping the same
    observer_length: "meters"  // keeping the same
  };
  
  for (const fieldName in fieldDefinitions) {
    const fieldDef = fieldDefinitions[fieldName];
    
    // Use the predefined default unit
    const currentUnit = defaultUnits[fieldName] || Object.keys(fieldDef.units)[0];
    
    initialFields[fieldName] = {
      ...fieldDef,
      value: fieldDef.def_val ? parseFloat(fieldDef.def_val) * fieldDef.units[currentUnit] : "",
      displayValue: fieldDef.def_val || "",
      current_unit: currentUnit,
      changed: false,
      set: false
    };
    
    initialHelpVisible[fieldName] = false;
  }
  
  setFields(initialFields);
  setHelpVisible(initialHelpVisible);
};
  
  // Handle input change
  const handleInputChange = (e, fieldName) => {
    const value = e.target.value;
    
    setFields(prevFields => ({
      ...prevFields,
      [fieldName]: {
        ...prevFields[fieldName],
        displayValue: value,
        changed: true,
        value: value && !isNaN(parseFloat(value)) ? 
          parseFloat(value) * prevFields[fieldName].units[prevFields[fieldName].current_unit] : ""
      }
    }));
  };
  
  // Handle unit change
  const handleUnitChange = (e, fieldName) => {
    const newUnit = e.target.value;
    const oldUnit = fields[fieldName].current_unit;
    const value = fields[fieldName].displayValue;
    
    let newValue = value;
    if (value && !isNaN(parseFloat(value))) {
      const oldUnitValue = fields[fieldName].units[oldUnit];
      const newUnitValue = fields[fieldName].units[newUnit];
      newValue = (parseFloat(value) * oldUnitValue / newUnitValue).toFixed(6);
      // Remove trailing zeros
      newValue = newValue.replace(/\.?0+$/, "");
    }
    
    setFields(prevFields => ({
      ...prevFields,
      [fieldName]: {
        ...prevFields[fieldName],
        displayValue: newValue,
        current_unit: newUnit
      }
    }));
  };
  
  // Toggle help text visibility
  const toggleHelp = (fieldName) => {
    setHelpVisible(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };
  
  // Calculate function
  const calculateValues = () => {
    try {
      // Process input and get updated fields
      let updatedFields = processInput();
      let changed = false;
      
      // Iterate until no more changes are made
      do {
        changed = false;
        
        for (const fieldName in updatedFields) {
          const field = updatedFields[fieldName];
          
          // Skip if already set or no calculation function
          if (field.set || !field.calc) continue;
          
          // Calculate field if empty or secondary field that hasn't been changed
          if ((field.value === "" || (!field.changed && !field.primary))) {
            // Check parameters
            let missing = 0;
            const parameters = {};
            
            for (let i = 0; i < field.parameters.length; i++) {
              const paramName = field.parameters[i];
              const paramField = updatedFields[paramName];
              
              if (paramField.value !== "" && (paramField.changed || paramField.primary || paramField.set)) {
                parameters[paramName] = paramField.value;
              } else {
                missing++;
              }
            }
            
            // Calculate if we have enough parameters
            if ((field.max_missing !== undefined && missing <= field.max_missing) || missing === 0) {
              field.set = true;
              changed = true;
              
              try {
                field.value = field.calc(parameters);
                field.displayValue = (field.value / field.units[field.current_unit]).toString();
              } catch (e) {
                // If calculation fails, set error and move on
                setErrorMessage(e.message);
              }
            }
          }
        }
      } while (changed);
      
      setFields(updatedFields);
    } catch (e) {
      setErrorMessage(e.message);
    }
  };
  
  // Clear all fields
  const clearAll = () => {
    const clearedFields = { ...fields };
    
    for (const fieldName in clearedFields) {
      const field = clearedFields[fieldName];
      
      if (field.def_val) {
        field.displayValue = field.def_val;
        field.value = parseFloat(field.def_val) * field.units[field.current_unit];
      } else {
        field.displayValue = "";
        field.value = "";
      }
      
      field.changed = false;
      field.set = false;
    }
    
    setFields(clearedFields);
    setErrorMessage("");
  };
  
  // Process input for calculations
  const processInput = () => {
    try {
      setErrorMessage("");
      const updatedFields = { ...fields };
      
      for (const fieldName in updatedFields) {
        updatedFields[fieldName] = { ...updatedFields[fieldName], set: false };
        const field = updatedFields[fieldName];
        
        if (field.displayValue && !isNaN(parseFloat(field.displayValue))) {
          field.value = parseFloat(field.displayValue) * field.units[field.current_unit];
          
          // Check min/max constraints
          if (field.hasOwnProperty('max_val') && field.value > field.max_val) {
            if (field.hasOwnProperty('max_error')) {
              throw new Error(field.max_error);
            }
          }
          
          if (field.hasOwnProperty('min_val') && field.value < field.min_val) {
            if (field.hasOwnProperty('min_error')) {
              throw new Error(field.min_error);
            }
          }
        } else {
          field.value = "";
        }
      }
      
      return updatedFields;
    } catch (e) {
      setErrorMessage(e.message);
      return fields;
    }
  };
  
  // Render function
  return (
    
    
    <div className="w-full max-w-4xl mx-auto bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg mb">
      <div className="p-6">
        <h2 className="text-center text-2xl text-zinc-100 mb-6">Relativistic Space Travel Calculator 
        <span className="text-base font-normal text-sky-400"> {VERSION}</span>
        </h2>
        
        <div className="space-y-6">
          {errorMessage && (
            <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded mb-4" role="alert">
              <p>{errorMessage}</p>
            </div>
          )}
          
          <div className="space-y-4">
            {Object.keys(fields).map((fieldName) => {
              const field = fields[fieldName];
              return (
                <div key={fieldName} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2 items-center">
                  <div>
                    <label htmlFor={fieldName} className="block text-sm font-medium text-zinc-300">
                      {field.lbl}
                      {field.help_text && (
                        <span 
                          className="ml-1 cursor-pointer inline-block w-5 h-5 text-center bg-sky-900/50 text-sky-200 rounded-full hover:bg-sky-800/50"
                          onClick={() => toggleHelp(fieldName)}
                        >
                          ?
                        </span>
                      )}
                    </label>
                    {helpVisible[fieldName] && (
                      <div className="mt-1 p-2 bg-zinc-800 rounded text-sm text-zinc-300 border border-zinc-700">
                        Help information for {field.lbl}
                      </div>
                    )}
                  </div>
                  <input
                    id={fieldName}
                    type="text"
                    value={field.displayValue || ""}
                    onChange={(e) => handleInputChange(e, fieldName)}
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                  />
                  <select
                    value={field.current_unit}
                    onChange={(e) => handleUnitChange(e, fieldName)}
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                  >
                    {Object.keys(field.units).map((unit) => (
                      <option key={unit} value={unit} className="bg-zinc-800">
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            
            <div className="flex justify-center space-x-4 mt-6">
              <button 
                onClick={calculateValues}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-zinc-100 rounded"
              >
                Calculate
              </button>
              <button 
                onClick={clearAll}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterstellarRocketCalculator;
"use client";
import React, { useState, useEffect } from "react";

const VERSION = "v0.2";

interface CalculationParameters {
  [key: string]: number;
}

interface FieldDefinition {
  lbl: string;
  calc?: ((parameters: CalculationParameters) => number) | null;
  parameters?: string[];
  units: Record<string, number>;
  ajaxValues?: string;
  primary?: boolean;
  min_val?: number;
  max_val?: number;
  min_error?: string;
  max_error?: string;
  help_text?: boolean;
  def_val?: string;
  max_missing?: number;
}

interface FieldState extends FieldDefinition {
  value: number | string;
  displayValue: string;
  current_unit: string;
  changed: boolean;
  set: boolean;
}

interface Fields {
  [key: string]: FieldState;
}

// Add help text definitions
const helpText = {
  distance: `This is the distance from earth to your destination. All objects in the database matching that start with the letters you have typed will appear. Select the one you want. Distances are approximate because the planets' positions change continuously relative to the earth.

If you leave distance blank, it will be calculated if you enter the observer time elapsed and the traveler's maximum velocity.`,

  acceleration: `This is the constant acceleration of the traveler's spacecraft. Half way through the journey, the spacecraft starts decelerating at the same rate.

If you leave the acceleration blank, it will be calculated using Newton's laws of motion (depending on which fields have values).

This is increasingly inaccurate as you approach the speed of light, so for large distances, such as to the nearest stars, it is better to enter the acceleration manually.

If a spacecraft accelerates constantly at 1g (9.8m/s²) the travelers on board can experience earth-like gravity. Unfortunately interstellar travel at this acceleration will likely never be achieved because of the huge amount of energy required. It is not possible to travel to the nearest stars at this acceleration if the fuel must be carried onboard the spacecraft, no matter what kind of fuel is used.`,

  max_velocity: `This is the maximum velocity the spacecraft will reach, from the perspective of an observer on earth. This occurs when the spacecraft is half way to its destination.`,

  observer_time: `This is the time elapsed for the whole journey from the observer on earth's time frame.`,

  traveler_time: `This is the time elapsed for the whole journey from the perspective of the spacecraft.`,

  spacecraft_mass: `This is the mass of the spacecraft excluding its fuel. The default value of 25,000kg is approximately the maximum payload of the Endeavour space shuttle.

Note that if this field is blanked out it is not calculated. This field must have a value if you want energy and fuel mass to be calculated.

Also note that if the fuel mass is calculated to be more than the mass of your spacecraft, then your trip cannot be done unless you extract fuel from space. If your fuel mass is more than half the mass of your spacecraft, you're probably on a one way trip, so take enough food, books and episodes of Star Trek to last the rest of your life.`,

  fuel_conversion_rate: `The fuel conversion rate is the efficiency with which your spacecraft's fuel is converted into energy. At today's fuel conversion rates there is no prospect of sending a spacecraft to another star in a reasonable period of time. Advances in technologies such as nuclear fusion are needed first.

The default fuel conversion rate of 0.008 is for hydrogen into helium fusion. David Oesper explains that this rate assumes 100% of the fuel goes into propelling the spacecraft, but there will be energy losses which will require a greater amount of fuel than this.

If you leave this field blank but enter the fuel mass, it is calculated by dividing the given fuel mass by what the fuel mass would be if it were perfectly efficient (i.e. a conversion rate of 1.0).`,

  fuel_mass: `This is the mass of the fuel needed for your journey.`,

  traveler_length: `This is the length of the spacecraft at the beginning of the journey. Note that the spacecraft length always stays the same for the people in it.`,

  observer_length: `This is the length of the spacecraft from the observer on earth's perspective. Of course spacecrafts are small, so it would be impossible to see a spacecraft from earth on an interstellar voyage.`,
};

const InterstellarRelativisticRocketCalculator = () => {
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
  const [fields, setFields] = useState < Fields > {};
  const [errorMessage, setErrorMessage] = useState < string > "";
  const [hoveredField, setHoveredField] = (useState < string) | (null > null);

  // Define calculation functions
  const calcVelocity = (parameters) => {
    let observedTimeElapsed = parameters.observer_time_elapsed;
    if (observedTimeElapsed > parameters.observer_time / 2) {
      observedTimeElapsed = parameters.observer_time - observedTimeElapsed;
    }

    const observedTimeProportion =
      observedTimeElapsed / parameters.observer_time;
    const timeProportionSq =
      1 / (observedTimeProportion * observedTimeProportion);

    const k = SPEED_OF_LIGHT_SQUARED / parameters.acceleration;
    const denominator =
      (parameters.acceleration *
        parameters.observer_time *
        parameters.observer_time) /
      timeProportionSq;
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
      const totalDistance = calcDist(
        params.observer_time,
        calcMaxVelocity(params)
      );
      params.observer_time_elapsed =
        params.observer_time - params.observer_time_elapsed;
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
    setErrorMessage(
      "The acceleration is calculated using Newtonian equations and is inaccurate when velocity approaches speed of light. It is better to input the acceleration yourself."
    );

    if (parameters.distance && parameters.observer_time) {
      const distance = parameters.distance / 2;
      const time = parameters.observer_time / 2;
      return (2 * distance) / (time * time);
    } else if (parameters.distance && parameters.max_velocity) {
      return (
        (parameters.max_velocity * parameters.max_velocity) /
        parameters.distance
      );
    } else {
      return (2 * parameters.max_velocity) / parameters.observer_time;
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

    return ((2 * SPEED_OF_LIGHT) / parameters.acceleration) * acosh_result;
  };

  const calcTravelerTime = (parameters) => {
    return (
      parameters.observer_time_elapsed *
      Math.sqrt(
        1 - (parameters.velocity * parameters.velocity) / SPEED_OF_LIGHT_SQUARED
      )
    );
  };

  const calcEnergy = (parameters) => {
    const vel_over_c_sq =
      (parameters.max_velocity * parameters.max_velocity) /
      SPEED_OF_LIGHT_SQUARED;
    const sqrt_term = 1 - vel_over_c_sq;
    const denominator = Math.sqrt(sqrt_term);
    const energy_per_kg = 2 * SPEED_OF_LIGHT_SQUARED * (1 / denominator - 1);

    return parameters.spacecraft_mass * energy_per_kg;
  };

  const calcFuelConversionRate = (parameters) => {
    const vel_to_c = parameters.max_velocity / SPEED_OF_LIGHT;
    const per_kg_100percent = (2 * vel_to_c) / (1 - vel_to_c);
    const perfect_efficient = per_kg_100percent * parameters.spacecraft_mass;

    return perfect_efficient / parameters.fuel_mass;
  };

  const calcFuelMass = (parameters) => {
    const vel_to_c = parameters.max_velocity / SPEED_OF_LIGHT;
    const per_kg_100percent = (2 * vel_to_c) / (1 - vel_to_c);

    return (
      (per_kg_100percent * parameters.spacecraft_mass) /
      parameters.fuel_conversion_rate
    );
  };

  const calcMinObserverLength = (parameters) => {
    const velocity_sq = parameters.max_velocity * parameters.max_velocity;

    return (
      parameters.traveler_length *
      Math.sqrt(1 - velocity_sq / SPEED_OF_LIGHT_SQUARED)
    );
  };

  const calcObserverLength = (parameters) => {
    const velocity_sq = parameters.velocity * parameters.velocity;

    return (
      parameters.traveler_length *
      Math.sqrt(1 - velocity_sq / SPEED_OF_LIGHT_SQUARED)
    );
  };

  const calcTravelerLength = (parameters) => {
    const velocity_sq = parameters.max_velocity * parameters.max_velocity;

    return (
      parameters.observer_length /
      Math.sqrt(1 - velocity_sq / SPEED_OF_LIGHT_SQUARED)
    );
  };

  // Define field definitions
  const fieldDefinitions: Record<string, FieldDefinition> = {
    distance: {
      lbl: "Distance",
      calc: calcTotalDistance,
      parameters: ["observer_time", "acceleration"],
      units: {
        meters: 1,
        kilometers: 1000,
        "light-seconds": SPEED_OF_LIGHT,
        "light-minutes": LIGHT_MINUTE,
        "astronomical unit": ASTRONOMICAL_UNIT,
        "light-years": LIGHT_YEAR,
        parsec: PARSEC,
      },
      ajaxValues: "distances",
      primary: true,
      min_val: 100,
      min_error:
        "This calculator is quite useless for such small distances. Try travel a bit further.",
      help_text: true,
      def_val: "11.2",
    },
    acceleration: {
      lbl: "Acceleration",
      calc: calcAcceleration,
      parameters: ["distance", "observer_time", "max_velocity"],
      max_missing: 1,
      units: {
        "m/s^2": 1,
        g: 9.8,
      },
      primary: true,
      min_val: 0.00000000000000001,
      min_error: "Distance too small.",
      max_val: SPEED_OF_LIGHT - 0.001,
      max_error:
        "Is your spaceship on steroids? You can't accelerate so quickly.",
      def_val: "9.8",
      help_text: true,
    },
    max_velocity: {
      lbl: "Maximum velocity (Δv/2)",
      calc: calcMaxVelocity,
      parameters: ["acceleration", "observer_time"],
      units: {
        "kilometers per hour": 0.27777777777777777777,
        "meters per second": 1,
        "kilometers per second": 1000,
        "speed of light (c)": SPEED_OF_LIGHT,
      },
      ajaxValues: "velocities",
      primary: false,
      min_val: 0.000000000000001,
      min_error:
        "Your velocity is too small. At this rate you won't get out your front door.",
      max_val: SPEED_OF_LIGHT - 0.001,
      max_error:
        "You have been watching too much Star Trek. Velocity must be less than the speed of light.",
      help_text: true,
    },
    observer_time: {
      lbl: "Observer time elapsed",
      calc: calcObserverTime,
      parameters: ["acceleration", "distance"],
      units: {
        seconds: 1,
        minutes: 60,
        hours: 3600,
        days: 86400,
        months: 2629800,
        years: 31557600,
      },
      primary: false,
      help_text: true,
    },
    traveler_time: {
      lbl: "Ship time elapsed",
      calc: calcTotalTravelerTime,
      parameters: ["acceleration", "distance"],
      units: {
        seconds: 1,
        minutes: 60,
        hours: 3600,
        days: 86400,
        months: 2629800,
        years: 31557600,
      },
      primary: false,
      help_text: true,
    },
    spacecraft_mass: {
      lbl: "Ship Dry Mass",
      calc: null,
      units: {
        grams: 0.001,
        kilograms: 1,
        tons: 1000,
      },
      primary: true,
      def_val: "25000",
      help_text: true,
    },
    fuel_mass: {
      lbl: "Wet Mass (Fuel Mass)",
      calc: calcFuelMass,
      parameters: ["max_velocity", "spacecraft_mass", "fuel_conversion_rate"],
      units: {
        kg: 1,
        tons: 1000,
      },
      primary: false,
      help_text: true,
    },
    fuel_conversion_rate: {
      lbl: "Fuel conversion rate",
      calc: calcFuelConversionRate,
      parameters: ["max_velocity", "spacecraft_mass", "fuel_mass"],
      units: {
        "kg x m x m": 1,
      },
      ajaxValues: "fuelrates",
      primary: true,
      def_val: "0.008",
      help_text: true,
    },
    traveler_length: {
      lbl: "Length of spacecraft at start",
      calc: calcTravelerLength,
      parameters: ["observer_length", "max_velocity"],
      units: {
        meters: 1,
        millimeters: 1 / 100,
        centimeters: 1 / 10,
        kilometers: 1000,
      },
      primary: true,
      def_val: "100",
      help_text: true,
    },
    observer_length: {
      lbl: "Shortest spacecraft length for observer",
      calc: calcMinObserverLength,
      parameters: ["traveler_length", "max_velocity"],
      units: {
        meters: 1,
        millimeters: 1 / 100,
        centimeters: 1 / 10,
        kilometers: 1000,
      },
      primary: false,
      help_text: true,
    },
  };

  // Initialize fields on component mount
  useEffect(() => {
    initializeFields();
  }, []);

  // Modified initializeFields function to set specific default units
  const initializeFields = () => {
    const initialFields: Fields = {};

    // Define default units for each field
    const defaultUnits = {
      distance: "light-years",
      acceleration: "m/s^2", // keeping the same
      max_velocity: "speed of light (c)",
      observer_time: "years",
      traveler_time: "years",
      spacecraft_mass: "tons",
      fuel_conversion_rate: "kg x m x m", // keeping the same
      fuel_mass: "tons",
      traveler_length: "meters", // keeping the same
      observer_length: "meters", // keeping the same
    };

    for (const fieldName in fieldDefinitions) {
      const fieldDef = fieldDefinitions[fieldName];

      // Use the predefined default unit
      const currentUnit =
        defaultUnits[fieldName] || Object.keys(fieldDef.units)[0];

      initialFields[fieldName] = {
        ...fieldDef,
        value: fieldDef.def_val
          ? parseFloat(fieldDef.def_val) * fieldDef.units[currentUnit]
          : "",
        displayValue: fieldDef.def_val || "",
        current_unit: currentUnit,
        changed: false,
        set: false,
      };
    }

    setFields(initialFields);
  };

  // Handle input change
  const handleInputChange = (e, fieldName) => {
    const value = e.target.value;

    setFields((prevFields) => ({
      ...prevFields,
      [fieldName]: {
        ...prevFields[fieldName],
        displayValue: value,
        changed: true,
        value:
          value && !isNaN(parseFloat(value))
            ? parseFloat(value) *
              prevFields[fieldName].units[prevFields[fieldName].current_unit]
            : "",
      },
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
      newValue = ((parseFloat(value) * oldUnitValue) / newUnitValue).toFixed(6);
      // Remove trailing zeros
      newValue = newValue.replace(/\.?0+$/, "");
    }

    setFields((prevFields) => ({
      ...prevFields,
      [fieldName]: {
        ...prevFields[fieldName],
        displayValue: newValue,
        current_unit: newUnit,
      },
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
          if (field.value === "" || (!field.changed && !field.primary)) {
            // Check parameters
            let missing = 0;
            const parameters: CalculationParameters = {};

            if (field.parameters) {
              for (let i = 0; i < field.parameters.length; i++) {
                const paramName = field.parameters[i];
                const paramField = updatedFields[paramName];

                if (
                  paramField.value !== "" &&
                  (paramField.changed || paramField.primary || paramField.set)
                ) {
                  parameters[paramName] =
                    typeof paramField.value === "string"
                      ? parseFloat(paramField.value)
                      : paramField.value;
                } else {
                  missing++;
                }
              }

              // Calculate if we have enough parameters
              if (
                (field.max_missing !== undefined &&
                  missing <= field.max_missing) ||
                missing === 0
              ) {
                field.set = true;
                changed = true;

                try {
                  field.value = field.calc(parameters);
                  field.displayValue = (
                    Number(field.value) / field.units[field.current_unit]
                  ).toString();
                } catch (e) {
                  // If calculation fails, set error and move on
                  if (e instanceof Error) {
                    setErrorMessage(e.message);
                  }
                }
              }
            }
          }
        }
      } while (changed);

      setFields(updatedFields);
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      }
    }
  };

  // Clear all fields
  const clearAll = () => {
    const clearedFields = { ...fields };

    for (const fieldName in clearedFields) {
      const field = clearedFields[fieldName];

      if (field.def_val) {
        field.displayValue = field.def_val;
        field.value =
          parseFloat(field.def_val) * field.units[field.current_unit];
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
          field.value =
            parseFloat(field.displayValue) * field.units[field.current_unit];

          // Check min/max constraints
          if (field.max_val !== undefined && field.value > field.max_val) {
            if (field.max_error) {
              throw new Error(field.max_error);
            }
          }

          if (field.min_val !== undefined && field.value < field.min_val) {
            if (field.min_error) {
              throw new Error(field.min_error);
            }
          }
        } else {
          field.value = "";
        }
      }

      return updatedFields;
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      }
      return fields;
    }
  };

  // When help text is visible, show it in a tooltip/popover
  const renderHelpText = (fieldName) => {
    if (hoveredField !== fieldName) return null;

    return (
      <div className="absolute z-10 mt-2 w-[300px] rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300 shadow-lg">
        {helpText[fieldName].split("\n\n").map((paragraph, i) => (
          <p key={i} className="mb-3 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>
    );
  };

  // Render function
  return (
    <div className="max-w-none rounded-sm border border-zinc-800 bg-zinc-900 shadow-lg">
      <div className="p-3 md:p-6">
        <div className="mb-6 flex flex-wrap items-baseline gap-2">
          <h2 className="text-2xl text-zinc-100">
            Interstellar Relativistic Rocket Calculator
          </h2>
          <span className="text-sm font-normal text-TOElightblue">
            {VERSION}
          </span>
        </div>

        {errorMessage && (
          <div
            className="mb-6 rounded border border-red-800 bg-red-900/50 px-4 py-3 text-red-200"
            role="alert"
          >
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
          {/* Input Fields */}
          {Object.keys(fields).map((fieldName) => {
            const field = fields[fieldName];
            return (
              <div key={fieldName} className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={fieldName}
                    className="text-sm font-medium text-zinc-300"
                  >
                    {field.lbl}
                  </label>
                  {field.help_text && (
                    <div
                      className="group relative"
                      onMouseEnter={() => setHoveredField(fieldName)}
                      onMouseLeave={() => setHoveredField(null)}
                      onFocus={() => setHoveredField(fieldName)}
                      onBlur={() => setHoveredField(null)}
                    >
                      <button
                        className="inline-flex h-5 w-5 items-center justify-center text-center text-TOElightblue/70 transition-colors hover:text-TOElightblue"
                        type="button"
                        aria-label={`Help for ${field.lbl}`}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <circle cx="8" cy="8" r="7" strokeWidth="1.5" />
                          <path
                            d="M8 12V7.5"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="8"
                            cy="5"
                            r="0.5"
                            fill="currentColor"
                            stroke="none"
                          />
                        </svg>
                      </button>
                      {renderHelpText(fieldName)}
                    </div>
                  )}
                </div>
                <input
                  id={fieldName}
                  type="text"
                  value={field.displayValue || ""}
                  onChange={(e) => handleInputChange(e, fieldName)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 focus:border-TOElightblue focus:ring-1 focus:ring-TOElightblue"
                />
                <select
                  value={field.current_unit}
                  onChange={(e) => handleUnitChange(e, fieldName)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-TOElightblue focus:ring-1 focus:ring-TOElightblue"
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
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={calculateValues}
            className="rounded-md bg-TOElightblue px-6 py-2 text-sm font-medium text-white hover:bg-TOElightblue/90 focus:ring-2 focus:ring-TOElightblue/75 focus:outline-none"
          >
            Calculate
          </button>
          <button
            onClick={clearAll}
            className="rounded-md bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 focus:ring-2 focus:ring-zinc-500 focus:outline-none"
          >
            Reset
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-right text-xs text-zinc-400">
          <a
            href="https://github.com/jveigel/interstellar-brachistochrone-calculators/blob/main/InterstellarRelativisticRocketCalculator.jsx"
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

export default InterstellarRelativisticRocketCalculator;

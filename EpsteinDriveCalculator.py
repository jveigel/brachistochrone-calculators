"""
Relativistic Nauvoo Drive Calculator with Efficiency Analysis
Calculates performance at different efficiency levels while maintaining thrust
"""
import math
import os
import csv
from datetime import datetime
from dataclasses import dataclass
from typing import Dict, List

# Physical constants
C = 299792458  # Speed of light in m/s
G = 9.80665    # Standard gravity in m/s²
LY_TO_M = 9.461e15  # Light years to meters
DHE3_ENERGY = 3.52e14  # D-He3 fusion energy yield in J/kg

@dataclass
class DriveParameters:
    """Parameters for the Epstein Drive"""
    thrust_per_engine: float  # Newtons
    num_engines: int
    exhaust_velocity: float   # m/s
    dry_mass: float          # kg
    efficiency: float        # 0 to 1

    @property
    def total_thrust(self) -> float:
        return self.thrust_per_engine * self.num_engines
    
    @property
    def mass_flow_rate(self) -> float:
        return self.total_thrust / self.exhaust_velocity
    
    @property
    def power_per_engine(self) -> float:
        return (self.thrust_per_engine * self.exhaust_velocity) / 2
    
    @property
    def total_power(self) -> float:
        return self.power_per_engine * self.num_engines
    
    @property
    def theoretical_power(self) -> float:
        """Maximum theoretical power from fusion reaction"""
        return self.mass_flow_rate * DHE3_ENERGY
    
    def calculate_fuel_mass(self, burn_time_seconds: float) -> float:
        """Calculate fuel mass needed for given burn time"""
        return self.mass_flow_rate * burn_time_seconds

def calculate_journey_parameters(drive: DriveParameters, distance_ly: float) -> Dict:
    """Calculate journey parameters including fuel requirements"""
    distance = distance_ly * LY_TO_M
    
    # Calculate acceleration
    initial_acceleration = drive.total_thrust / (drive.dry_mass + drive.calculate_fuel_mass(3600))  # Use 1 hour of fuel for initial mass
    
    # Calculate time needed to reach cruise velocity (0.119c for Tau Ceti in 100 years)
    target_velocity = 0.119 * C
    time_to_velocity = target_velocity / initial_acceleration
    
    # Calculate fuel needed for acceleration and deceleration
    fuel_for_accel = drive.calculate_fuel_mass(time_to_velocity)
    total_fuel_mass = 2 * fuel_for_accel  # Double for deceleration
    
    # Calculate mass ratio
    mass_ratio = (drive.dry_mass + total_fuel_mass) / drive.dry_mass
    
    # Calculate relativistic factors
    gamma = 1 / math.sqrt(1 - (target_velocity/C)**2)
    
    # Calculate journey times
    coast_distance = distance - (2 * (0.5 * initial_acceleration * time_to_velocity**2))
    coast_time = coast_distance / target_velocity
    
    total_coordinate_time = coast_time + (2 * time_to_velocity)
    total_proper_time = coast_time/gamma + (2 * time_to_velocity/gamma)
    
    return {
        'acceleration_days': time_to_velocity / (24 * 3600),
        'coast_years': coast_time / (365.25 * 24 * 3600),
        'total_years': total_coordinate_time / (365.25 * 24 * 3600),
        'ship_years': total_proper_time / (365.25 * 24 * 3600),
        'fuel_mass_tons': total_fuel_mass / 1000,
        'mass_ratio': mass_ratio,
        'peak_velocity_c': target_velocity / C,
        'gamma': gamma,
        'power_output_W': drive.total_power,
        'theoretical_power_W': drive.theoretical_power,
        'mass_flow_kg_s': drive.mass_flow_rate
    }

def format_power(watts: float) -> str:
    """Format power in appropriate units"""
    if watts >= 1e15:
        return f"{watts/1e15:.1f} PW"
    elif watts >= 1e12:
        return f"{watts/1e12:.1f} TW"
    else:
        return f"{watts/1e9:.1f} GW"

def save_to_csv(results: Dict, filename: str = None):
    """Save results to CSV file"""
    if not os.path.exists('exports'):
        os.makedirs('exports')
    
    if filename is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'exports/nauvoo_efficiency_{timestamp}.csv'
    else:
        filename = f'exports/{filename}'
    
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Write header
        writer.writerow(['Efficiency Analysis for Nauvoo Drive'])
        writer.writerow([])
        
        # Write common parameters
        writer.writerow(['Common Parameters'])
        writer.writerow(['Parameter', 'Value'])
        writer.writerow(['Total Thrust (MN)', f"{results['base_thrust']/1e6:.1f}"])
        writer.writerow(['Exhaust Velocity (c)', f"{results['exhaust_vel']/C:.3f}"])
        writer.writerow(['Dry Mass (tons)', f"{results['dry_mass']/1000:.0f}"])
        writer.writerow([])
        
        # Write efficiency comparison
        writer.writerow(['Efficiency Comparison'])
        writer.writerow(['Parameter', '0.65% (Current)', '0.8% (Improved)', '20% (Theoretical)'])
        
        for param in ['mass_flow_kg_s', 'fuel_mass_tons', 'power_output_W', 'theoretical_power_W']:
            writer.writerow([
                param.replace('_', ' ').title(),
                f"{results['0.0065'][param]:.1f}",
                f"{results['0.008'][param]:.1f}",
                f"{results['0.2'][param]:.1f}"
            ])
        
    print(f"\nResults saved to {filename}")

def main():
    # Base parameters
    base_thrust = 144e6  # 144 MN
    exhaust_vel = 0.08 * C
    dry_mass = 13.5e6  # 13,500 tons
    
    # Calculate for different efficiencies
    efficiencies = {
        '0.0065': 0.0065,  # Current
        '0.008': 0.008,    # Slightly improved
        '0.2': 0.2         # Theoretical maximum
    }
    
    results = {
        'base_thrust': base_thrust,
        'exhaust_vel': exhaust_vel,
        'dry_mass': dry_mass
    }
    
    print("\nNauvoo Drive Efficiency Analysis")
    print("===============================")
    
    for eff_name, efficiency in efficiencies.items():
        drive = DriveParameters(
            thrust_per_engine=base_thrust/8,
            num_engines=8,
            exhaust_velocity=exhaust_vel,
            dry_mass=dry_mass,
            efficiency=efficiency
        )
        
        # Calculate for Tau Ceti (11.9 ly)
        journey = calculate_journey_parameters(drive, 11.9)
        results[eff_name] = journey
        
        print(f"\nEfficiency: {efficiency*100:.1f}%")
        print(f"Mass flow rate: {journey['mass_flow_kg_s']:.1f} kg/s")
        print(f"Total fuel mass: {journey['fuel_mass_tons']:.0f} tons")
        print(f"Power output: {format_power(journey['power_output_W'])}")
        print(f"Journey time to Tau Ceti:")
        print(f"  Earth time: {journey['total_years']:.1f} years")
        print(f"  Ship time: {journey['ship_years']:.1f} years")
    
    save_to_csv(results)

if __name__ == "__main__":
    main()
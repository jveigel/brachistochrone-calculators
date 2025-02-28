"""
Brachistochrone Calculator for Interplanetary Travel Times

This module calculates travel times between planets using brachistochrone trajectories
under different acceleration scenarios.
"""

from dataclasses import dataclass
from datetime import datetime
from itertools import combinations
from typing import Dict, List, Tuple
import csv
import math
import os

def days_to_dhm(days: float) -> str:
    """Convert decimal days to days and hours string."""
    total_hours = days * 24
    d = int(total_hours // 24)
    h = int(total_hours % 24)
    return f"{d}d {h}h"

# Physical constants
@dataclass(frozen=True)
class Constants:
    G_MULTIPLIER: float = 0.0098  # km/s² per g
    G: float = 0.0098  # km/s² (1g acceleration)
    G_1_3: float = 0.00326667  # km/s² (1/3g acceleration)
    AU_TO_KM: float = 1.496e8  # kilometers per AU
    C: float = 299792.458  # Speed of light in km/s

# Planetary orbital parameters
@dataclass(frozen=True)
class Planet:
    perihelion: float  # AU
    aphelion: float  # AU

PLANETS: Dict[str, Planet] = {
    'Mercury': Planet(0.307, 0.467),
    'Venus': Planet(0.718, 0.728),
    'Earth': Planet(0.983, 1.017),
    'Mars': Planet(1.381, 1.666),
    'Ceres': Planet(2.5518, 2.9775),
    'Jupiter': Planet(4.950, 5.457),
    'Saturn': Planet(9.041, 10.124),
    'Uranus': Planet(18.375, 20.063),
    'Neptune': Planet(29.767, 30.441)
}

@dataclass
class TravelMetrics:
    """Container for travel calculation results."""
    min_distance: float  # AU
    max_distance: float  # AU
    min_time: float  # days
    max_time: float  # days
    median_time: float  # days
    min_delta_v: float  # km/s for minimum distance
    max_delta_v: float  # km/s for maximum distance

class BrachistochroneCalculator:
    """Handles calculations for brachistochrone trajectories between planets."""
    
    def __init__(self, constants: Constants = Constants()):
        self.constants = constants

    def calculate_brachistochrone_time(self, distance_km: float, acceleration_kms2: float) -> float:
        """Calculate brachistochrone time for given distance and acceleration."""
        return 2 * math.sqrt(distance_km / acceleration_kms2)

    def calculate_max_velocity(self, time_seconds: float, acceleration_kms2: float) -> float:
        """Calculate maximum velocity achieved at midpoint."""
        return acceleration_kms2 * (time_seconds / 2)

    def calculate_total_deltav(self, max_velocity: float) -> float:
        """Calculate total delta-v required for the mission."""
        return 2 * max_velocity

    def get_orbital_distances(self, p1: Planet, p2: Planet) -> Tuple[float, float]:
        """Calculate minimum and maximum possible distances between two planetary orbits."""
        min_dist = max(0, max(p1.perihelion, p2.perihelion) - min(p1.aphelion, p2.aphelion))
        max_dist = p1.aphelion + p2.aphelion
        return (min_dist, max_dist)

    def calculate_median_distance(self, p1: Planet, p2: Planet) -> float:
        """Calculate median distance between two planetary orbits."""
        r1 = (p1.perihelion + p1.aphelion) / 2
        r2 = (p2.perihelion + p2.aphelion) / 2
        
        if abs(r1 - 1) < 0.1:  # If origin is Earth's orbit
            return math.sqrt(1 + r2 * r2)
        else:
            m1 = math.sqrt(1 + r1 * r1)
            m2 = math.sqrt(1 + r2 * r2)
            return abs(m2 - m1)

    def calculate_metrics(self, origin: Planet, destination: Planet,
                         acceleration: float) -> TravelMetrics:
        """Calculate complete travel metrics between two planets."""
        min_dist, max_dist = self.get_orbital_distances(origin, destination)
        min_dist_km = min_dist * self.constants.AU_TO_KM
        max_dist_km = max_dist * self.constants.AU_TO_KM
        
        min_time = self.calculate_brachistochrone_time(min_dist_km, acceleration)
        max_time = self.calculate_brachistochrone_time(max_dist_km, acceleration)
        
        median_dist = self.calculate_median_distance(origin, destination)
        median_time = self.calculate_brachistochrone_time(
            median_dist * self.constants.AU_TO_KM, acceleration)
        
        min_velocity = self.calculate_max_velocity(min_time, acceleration)
        max_velocity = self.calculate_max_velocity(max_time, acceleration)
        
        return TravelMetrics(
            min_distance=min_dist,
            max_distance=max_dist,
            min_time=min_time / 86400,  # Convert to days
            max_time=max_time / 86400,
            median_time=median_time / 86400,
            min_delta_v=self.calculate_total_deltav(min_velocity),
            max_delta_v=self.calculate_total_deltav(max_velocity)
        )

class DataFormatter:
    """Handles data formatting and file output."""
    
    @staticmethod
    def generate_csv_row(origin_name: str, dest_name: str, 
                        metrics_1g: TravelMetrics, metrics_1_3g: TravelMetrics,
                        origin: Planet, destination: Planet) -> List:
        """Generate a single CSV row."""
        return [
            origin_name,
            dest_name,
            round(metrics_1g.min_distance, 6),
            round(metrics_1g.max_distance, 6),
            round(metrics_1g.min_distance * Constants.AU_TO_KM, 0),
            round(metrics_1g.max_distance * Constants.AU_TO_KM, 0),
            round(metrics_1g.min_time, 3),
            round(metrics_1g.max_time, 3),
            round(metrics_1g.median_time, 3),
            round(metrics_1g.min_delta_v, 2),
            round(metrics_1g.max_delta_v, 2),
            round(metrics_1_3g.min_time, 3),
            round(metrics_1_3g.max_time, 3),
            round(metrics_1_3g.median_time, 3),
            round(metrics_1_3g.min_delta_v, 2),
            round(metrics_1_3g.max_delta_v, 2),
            origin.perihelion,
            origin.aphelion,
            destination.perihelion,
            destination.aphelion
        ]

    @staticmethod
    def format_markdown_row(name1: str, name2: str, metrics: TravelMetrics, 
                          max_velocity: float) -> str:
        """Format a single markdown table row with separated columns."""
        route = f"{name1} -> {name2}"
        min_distance = f"{metrics.min_distance * Constants.AU_TO_KM:,.0f}"
        max_distance = f"{metrics.max_distance * Constants.AU_TO_KM:,.0f}"
        min_time = days_to_dhm(metrics.min_time)
        max_time = days_to_dhm(metrics.max_time)
        median_time = days_to_dhm(metrics.median_time)
        velocity = f"{max_velocity:,.0f}"
        min_delta_v = f"{metrics.min_delta_v:,.0f}"
        max_delta_v = f"{metrics.max_delta_v:,.0f}"
        
        return f"| {route} | {min_distance} | {max_distance} | {min_time} | {max_time} | {median_time} | {velocity} | {min_delta_v} | {max_delta_v} |"

def generate_travel_matrix(all_routes, planet_order):
    """Generate a travel time matrix for markdown output."""
    # Create a dictionary to store min/max travel times between planets
    travel_times = {}
    
    # Process each route
    for row in all_routes:
        origin = row[0]
        destination = row[1]
        min_time = days_to_dhm(float(row[2]))  # min_time_days_1_3g
        max_time = days_to_dhm(float(row[3]))  # max_time_days_1_3g
        
        # Store in dictionary (in both directions)
        key = f"{origin}_{destination}"
        travel_times[key] = f"{min_time}-{max_time}"
    
    # Generate the matrix header
    matrix = "*Travel time ranges (min-max)*\n\n"
    matrix += "| From → To | " + " | ".join(planet_order) + " |\n"
    matrix += "|-----------|" + "---------|" * len(planet_order) + "\n"
    
    # Generate each row of the matrix
    for origin in planet_order:
        row = f"| **{origin}** |"
        
        for destination in planet_order:
            if origin == destination:
                row += " - |"
            else:
                key = f"{origin}_{destination}"
                rev_key = f"{destination}_{origin}"
                
                # Use the key if it exists, otherwise use reverse key
                if key in travel_times:
                    row += f" {travel_times[key]} |"
                elif rev_key in travel_times:
                    row += f" {travel_times[rev_key]} |"
                else:
                    row += " - |"
        
        matrix += row + "\n"
    
    return matrix

def save_to_markdown(data, base_filename='brachistochrone_1_3g'):
    """Save 1/3g results to markdown file with timestamp, sorted by min delta-v"""
    if not os.path.exists('exports'):
        os.makedirs('exports')
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'exports/{base_filename}_{timestamp}.md'
    
    # Define planet order for matrix
    planet_order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Ceres', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
    
    # Convert data to list of dictionaries for sorting
    formatted_data = []
    for row in data:
        formatted_data.append({
            'route': f"{row[0]} -> {row[1]}",
            'min_time': days_to_dhm(float(row[2])),
            'max_time': days_to_dhm(float(row[3])),
            'min_delta_v': float(row[12]),  # min_deltav_kms_1_3g
            'max_delta_v': float(row[13])   # max_deltav_kms_1_3g
        })
    
    # Sort by minimum delta-v
    formatted_data.sort(key=lambda x: x['min_delta_v'])
    
    with open(filename, 'w', encoding='utf-8') as f:  # Add UTF-8 encoding
        f.write("## Brachistochrone Travel Times (1/3g)\n\n")
        
        # Add travel time matrix
        f.write("### Travel Time Matrix\n\n")
        f.write(generate_travel_matrix(data, planet_order))
        f.write("\n\n")
        
        # Add sorted routes by delta-v
        f.write("### Routes Sorted by Delta-V\n\n")
        f.write("| Route | Min Time | Max Time | Min dv | Max dv |\n")  # Changed Δv to dv
        f.write("|--------|-----------|-----------|---------|--------|\n")
        
        for row in formatted_data:
            f.write(f"| {row['route']} | {row['min_time']} | {row['max_time']} | {row['min_delta_v']:,.0f} | {row['max_delta_v']:,.0f} |\n")
    
    print(f"Markdown data saved to: {filename}")

def main():
    """Main execution function."""
    calculator = BrachistochroneCalculator()
    formatter = DataFormatter()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Define solar system order for sorting
    planet_order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Ceres', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
    
    # Generate all routes
    routes = []
    headers = [
        'origin_planet', 'destination_planet',
        'min_time_days_1_3g', 'max_time_days_1_3g', 'median_time_days_1_3g',
        'min_time_days_1g', 'max_time_days_1g', 'median_time_days_1g',
        'min_distance_au', 'max_distance_au',
        'min_distance_km', 'max_distance_km',
        'min_deltav_kms_1_3g', 'max_deltav_kms_1_3g',
        'min_deltav_kms_1g', 'max_deltav_kms_1g',
        'origin_perihelion_au', 'origin_aphelion_au',
        'destination_perihelion_au', 'destination_aphelion_au'
    ]
    
    # Generate routes in solar system order (remove Alpha Centauri section)
    for origin_idx, name1 in enumerate(planet_order):
        for name2 in planet_order[origin_idx + 1:]:
            metrics_1g = calculator.calculate_metrics(
                PLANETS[name1], PLANETS[name2], Constants.G)
            metrics_1_3g = calculator.calculate_metrics(
                PLANETS[name1], PLANETS[name2], Constants.G_1_3)
            
            row = [
                name1, name2,
                round(metrics_1_3g.min_time, 3),
                round(metrics_1_3g.max_time, 3),
                round(metrics_1_3g.median_time, 3),
                round(metrics_1g.min_time, 3),
                round(metrics_1g.max_time, 3),
                round(metrics_1g.median_time, 3),
                round(metrics_1g.min_distance, 6),
                round(metrics_1g.max_distance, 6),
                round(metrics_1g.min_distance * Constants.AU_TO_KM, 0),
                round(metrics_1g.max_distance * Constants.AU_TO_KM, 0),
                round(metrics_1_3g.min_delta_v, 2),
                round(metrics_1_3g.max_delta_v, 2),
                round(metrics_1g.min_delta_v, 2),
                round(metrics_1g.max_delta_v, 2),
                PLANETS[name1].perihelion,
                PLANETS[name1].aphelion,
                PLANETS[name2].perihelion,
                PLANETS[name2].aphelion
            ]
            routes.append(row)
    
    # Write outputs
    csv_filename = f"exports/brachistochrone_extended_{timestamp}.csv"
    with open(csv_filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(routes)
    
    print(f"CSV data saved to: {csv_filename}")
    print(f"Total routes calculated: {len(routes)}")
    save_to_markdown(routes)

if __name__ == "__main__":
    main()
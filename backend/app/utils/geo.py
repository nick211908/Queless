from geopy.distance import geodesic

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the distance in meters between two coordinates.
    """
    return geodesic((lat1, lon1), (lat2, lon2)).meters

def is_within_radius(lat1: float, lon1: float, lat2: float, lon2: float, radius_meters: float) -> bool:
    """
    Checks if point 1 is within radius of point 2.
    """
    return calculate_distance(lat1, lon1, lat2, lon2) <= radius_meters

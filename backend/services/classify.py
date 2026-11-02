"""
Groundwater level classification and trend detection.
Supports both depth-to-water (positive mbgl) and elevation (negative) standards.
"""

def classify_level(wl: float) -> str:
    """
    Classify groundwater level.
    For depth-to-water (positive meters below ground level, mbgl):
      < 5.0m: Safe
      5.0m - 10.0m: Semi-critical
      10.0m - 20.0m: Critical
      >= 20.0m: Over-exploited
    For legacy negative elevation values:
      >= -10.0: Safe
      >= -20.0: Semi-critical
      >= -40.0: Critical
      < -40.0: Over-exploited
    """
    if wl < 0:
        # Negative elevation convention
        if wl >= -10:
            return "Safe"
        elif wl >= -20:
            return "Semi-critical"
        elif wl >= -40:
            return "Critical"
        else:
            return "Over-exploited"
    else:
        # Positive depth below ground level convention (standard CGWB mbgl)
        if wl < 5.0:
            return "Safe"
        elif wl < 10.0:
            return "Semi-critical"
        elif wl < 20.0:
            return "Critical"
        else:
            return "Over-exploited"


def trend_alert(predictions, tolerance: float = 0.05) -> str:
    """
    Detect future groundwater trend based on predicted trajectory.
    """
    if not predictions or len(predictions) < 2:
        return "Stable"

    start, end = predictions[0], predictions[-1]
    diff = end - start

    # Check convention based on sign
    if start >= 0:
        # Depth below ground: higher number = deeper water table (decline)
        if diff > tolerance:
            return "⚠️ Declining (Depletion)"
        elif diff < -tolerance:
            return "✅ Increasing (Recharge)"
        else:
            return "Stable"
    else:
        # Negative elevation: lower number = deeper water (decline)
        if diff < -tolerance:
            return "⚠️ Declining (Depletion)"
        elif diff > tolerance:
            return "✅ Increasing (Recharge)"
        else:
            return "Stable"

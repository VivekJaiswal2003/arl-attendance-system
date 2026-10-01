export type SiteRadiusCheck = {
  distanceMeters: number;
  withinRadius: boolean;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);
  const deltaLat = toRadians(latitude2 - latitude1);
  const deltaLon = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function isWithinSiteRadius(
  workerLatitude: number,
  workerLongitude: number,
  siteLatitude: number,
  siteLongitude: number,
  allowedRadiusMeters: number,
): SiteRadiusCheck {
  const distanceMeters = haversineDistanceMeters(
    workerLatitude,
    workerLongitude,
    siteLatitude,
    siteLongitude,
  );

  return {
    distanceMeters,
    withinRadius: distanceMeters <= allowedRadiusMeters,
  };
}

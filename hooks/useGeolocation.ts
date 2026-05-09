import { useCallback, useState } from 'react';

interface GeolocationResult {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  getLocation: () => void;
}

const getErrorMessage = (code: number) => {
  switch (code) {
    case GeolocationPositionError.PERMISSION_DENIED:
      return 'Location permission is required to mark attendance';
    case GeolocationPositionError.POSITION_UNAVAILABLE:
      return 'Unable to determine your location';
    case GeolocationPositionError.TIMEOUT:
      return 'Location request timed out — please try again';
    default:
      return 'Unable to determine your location';
  }
};

export function useGeolocation(): GeolocationResult {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Unable to determine your location');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setError(null);
        setLoading(false);
      },
      (positionError) => {
        setError(getErrorMessage(positionError.code));
        setLoading(false);
      },
    );
  }, []);

  return { latitude, longitude, error, loading, getLocation };
}

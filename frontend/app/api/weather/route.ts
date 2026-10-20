import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 1 minute revalidation

interface WeatherResponse {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  temp: number;
  weatherCode: number;
}

let cachedWeather: {
  timestamp: number;
  data: WeatherResponse;
} | null = null;

const CACHE_TTL_MS = 60000; // 1 minute in-memory cache

export async function GET(request: Request) {
  const now = Date.now();
  if (cachedWeather && now - cachedWeather.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      ...cachedWeather.data,
    });
  }

  // Detect IP if forwarded by proxy, else empty to query self
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientIp = forwardedFor && !forwardedFor.startsWith('127.') && forwardedFor !== '::1' ? forwardedFor : '';

  let country = 'United Kingdom';
  let city = 'London';
  let latitude = 51.5074;
  let longitude = -0.1278;

  // 1. Try ipwho.is
  try {
    const geoUrl = clientIp ? `https://ipwho.is/${clientIp}` : 'https://ipwho.is/';
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'LondonBigBen/1.0' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });

    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo.success !== false && geo.country) {
        country = geo.country || country;
        city = geo.city || city;
        if (typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }
    }
  } catch {
    // 2. Fallback to geojs.io
    try {
      const geoUrl = clientIp ? `https://get.geojs.io/v1/ip/geo/${clientIp}.json` : 'https://get.geojs.io/v1/ip/geo.json';
      const geoRes = await fetch(geoUrl, {
        signal: AbortSignal.timeout(4000),
        cache: 'no-store',
      });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.country) {
          country = geo.country;
          city = geo.city || city;
          if (geo.latitude && geo.longitude) {
            latitude = parseFloat(geo.latitude);
            longitude = parseFloat(geo.longitude);
          }
        }
      }
    } catch {
      // Keep defaults
    }
  }

  // 3. Fetch real-time weather from Open-Meteo
  let temp = 20;
  let weatherCode = 1;

  try {
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`;
    const wxRes = await fetch(wxUrl, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    if (wxRes.ok) {
      const wx = await wxRes.json();
      if (wx?.current?.temperature_2m !== undefined) {
        temp = Math.round(wx.current.temperature_2m);
        weatherCode = wx.current.weathercode ?? 1;
      }
    } else {
      console.warn('Open-Meteo responded with status:', wxRes.status);
    }
  } catch (wxErr: any) {
    console.warn('Weather fetch error:', wxErr?.message || wxErr);
  }

  const result: WeatherResponse = {
    country,
    city,
    latitude,
    longitude,
    temp,
    weatherCode,
  };

  cachedWeather = {
    timestamp: now,
    data: result,
  };

  return NextResponse.json({
    success: true,
    ...result,
  });
}

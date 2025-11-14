import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, date, address } = await req.json();

    let lat = latitude;
    let lon = longitude;

    // If address is provided, geocode it first
    if (address && (!latitude || !longitude)) {
      // Try to geocode with progressively simplified addresses
      const addressVariations = [
        address, // Original full address
        address.replace(/\s*(Unit|Suite|Apt|Apartment|#)\s*[\d\w-]+/gi, '').trim(), // Remove unit numbers
        address.split(',').slice(0, -1).join(',').trim() // Remove last part (usually state+zip)
      ].filter(addr => addr.length > 0);

      let geocodeData = null;
      
      for (const addressVariation of addressVariations) {
        try {
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressVariation)}&format=json&limit=1`,
            {
              headers: {
                'User-Agent': 'CouplesApp/1.0'
              }
            }
          );
          
          const data = await geocodeResponse.json();
          
          if (data && data.length > 0) {
            geocodeData = data;
            console.log(`Successfully geocoded with variation: ${addressVariation}`);
            break;
          }
        } catch (error) {
          console.log(`Failed to geocode with variation: ${addressVariation}`, error);
          continue;
        }
      }
      
      if (!geocodeData || geocodeData.length === 0) {
        throw new Error('Address not found. Please check the address and try again.');
      }

      lat = parseFloat(geocodeData[0].lat);
      lon = parseFloat(geocodeData[0].lon);
    }

    if (!lat || !lon || !date) {
      throw new Error('Missing required parameters: latitude/longitude/address and date are required');
    }

    // Use Open-Meteo API (free, no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America/Los_Angeles&start_date=${date}&end_date=${date}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.daily) {
      throw new Error('No weather data available for this date');
    }

    // Weather code mapping
    const weatherCodeMap: { [key: number]: string } = {
      0: '晴天',
      1: '晴朗',
      2: '多云',
      3: '阴天',
      45: '雾',
      48: '雾凇',
      51: '小雨',
      53: '中雨',
      55: '大雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      71: '小雪',
      73: '中雪',
      75: '大雪',
      77: '雪',
      80: '阵雨',
      81: '阵雨',
      82: '暴雨',
      85: '阵雪',
      86: '暴雪',
      95: '雷暴',
      96: '雷暴冰雹',
      99: '雷暴冰雹',
    };

    const weatherCode = data.daily.weathercode[0];
    const tempMax = data.daily.temperature_2m_max[0];
    const tempMin = data.daily.temperature_2m_min[0];
    const condition = weatherCodeMap[weatherCode] || '未知';

    return new Response(
      JSON.stringify({
        condition,
        temperature: `${Math.round(tempMin)}°C - ${Math.round(tempMax)}°C`,
        tempMax: Math.round(tempMax),
        tempMin: Math.round(tempMin),
        weatherCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
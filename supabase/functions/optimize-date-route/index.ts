import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Location {
  name: string;
  address: string;
  type: string;
  priority: 'must_go' | 'chill';
  estimatedDuration: number;
  lat?: number;
  lng?: number;
}

interface RouteRequest {
  startPoint: {
    address: string;
    time: string;
    lat?: number;
    lng?: number;
  };
  endPoint: {
    address: string;
    time: string;
    lat?: number;
    lng?: number;
  };
  places: Location[];
  planDate: string;
}

interface GeocodedLocation extends Location {
  lat: number;
  lng: number;
}

async function geocodeAddress(address: string, mapboxToken: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
    );
    
    if (!response.ok) {
      console.error(`Geocoding failed for ${address}:`, response.statusText);
      return null;
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    return null;
  } catch (error) {
    console.error(`Error geocoding ${address}:`, error);
    return null;
  }
}

async function getDistanceMatrix(locations: Array<{ lat: number; lng: number }>, mapboxToken: string) {
  const coordinates = locations.map(loc => `${loc.lng},${loc.lat}`).join(';');
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinates}?access_token=${mapboxToken}&annotations=distance,duration`
    );
    
    if (!response.ok) {
      console.error('Distance matrix failed:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting distance matrix:', error);
    return null;
  }
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addTime(currentMinutes: number, additionalMinutes: number): number {
  return currentMinutes + additionalMinutes;
}

function shouldInsertMeal(currentTime: number, nextTime: number): { shouldInsert: boolean; mealType: 'lunch' | 'dinner' | null } {
  const lunchStart = 12 * 60; // 12:00
  const lunchEnd = 13 * 60; // 13:00
  const dinnerStart = 17.5 * 60; // 17:30
  const dinnerEnd = 19 * 60; // 19:00
  
  // Check if we cross lunch time
  if (currentTime < lunchStart && nextTime > lunchStart) {
    return { shouldInsert: true, mealType: 'lunch' };
  }
  
  // Check if we cross dinner time
  if (currentTime < dinnerStart && nextTime > dinnerStart) {
    return { shouldInsert: true, mealType: 'dinner' };
  }
  
  return { shouldInsert: false, mealType: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startPoint, endPoint, places, planDate }: RouteRequest = await req.json();
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    if (!mapboxToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    }

    console.log('Optimizing route with:', { startPoint, endPoint, places: places.length });

    // Geocode all locations
    const geocodedPlaces: GeocodedLocation[] = [];
    for (const place of places) {
      if (place.lat && place.lng) {
        geocodedPlaces.push({ ...place, lat: place.lat, lng: place.lng });
      } else {
        const coords = await geocodeAddress(place.address, mapboxToken);
        if (coords) {
          geocodedPlaces.push({ ...place, ...coords });
        } else {
          console.warn(`Failed to geocode: ${place.address}`);
        }
      }
    }

    // Geocode start and end points
    let startCoords = startPoint.lat && startPoint.lng ? 
      { lat: startPoint.lat, lng: startPoint.lng } : 
      await geocodeAddress(startPoint.address, mapboxToken);
    
    let endCoords = endPoint.lat && endPoint.lng ? 
      { lat: endPoint.lat, lng: endPoint.lng } : 
      await geocodeAddress(endPoint.address, mapboxToken);

    if (!startCoords || !endCoords) {
      throw new Error('Failed to geocode start or end point');
    }

    // Separate must-go and chill places
    const mustGoPlaces = geocodedPlaces.filter(p => p.priority === 'must_go');
    const chillPlaces = geocodedPlaces.filter(p => p.priority === 'chill');

    console.log(`Must-go: ${mustGoPlaces.length}, Chill: ${chillPlaces.length}`);

    // Build distance matrix for all locations
    const allLocations = [
      startCoords,
      ...mustGoPlaces,
      ...chillPlaces,
      endCoords
    ];

    const matrix = await getDistanceMatrix(allLocations, mapboxToken);
    if (!matrix || !matrix.durations) {
      throw new Error('Failed to get distance matrix');
    }

    const durations = matrix.durations;
    const distances = matrix.distances;

    // Initialize route
    const route: any[] = [];
    let currentTime = parseTime(startPoint.time);
    let currentIndex = 0; // Start point index in matrix
    const visitedIndices = new Set([0]);

    // Add must-go places using nearest neighbor algorithm
    const mustGoIndices = mustGoPlaces.map((_, i) => i + 1); // Indices in matrix
    const remaining = [...mustGoIndices];

    while (remaining.length > 0) {
      let nearestIndex = -1;
      let shortestTime = Infinity;
      
      // Find nearest unvisited must-go place
      for (const idx of remaining) {
        const travelTime = Math.ceil(durations[currentIndex][idx] / 60);
        if (travelTime < shortestTime) {
          shortestTime = travelTime;
          nearestIndex = idx;
        }
      }

      if (nearestIndex === -1) break;

      const travelTime = Math.ceil(durations[currentIndex][nearestIndex] / 60);
      const travelDistance = (distances[currentIndex][nearestIndex] / 1000).toFixed(1);
      const placeIndex = nearestIndex - 1;
      const place = mustGoPlaces[placeIndex];

      // Check if we should insert a meal
      const nextTime = addTime(currentTime, travelTime);
      const mealCheck = shouldInsertMeal(currentTime, nextTime);
      
      if (mealCheck.shouldInsert) {
        const mealTime = mealCheck.mealType === 'lunch' ? 12 * 60 : 17.5 * 60;
        route.push({
          orderIndex: route.length,
          locationName: `${mealCheck.mealType === 'lunch' ? '午餐' : '晚餐'}时间`,
          locationAddress: '待选择餐厅',
          locationType: '餐厅',
          latitude: null,
          longitude: null,
          activityTime: formatTime(mealTime),
          activityEndTime: formatTime(mealTime + 60),
          estimatedDuration: 60,
          travelTimeFromPrevious: 0,
          priority: 'must_go',
          isAutoScheduled: true,
          description: `建议在附近选择${mealCheck.mealType === 'lunch' ? '午餐' : '晚餐'}地点`,
        });
        currentTime = mealTime + 60;
      }

      currentTime = addTime(currentTime, travelTime);

      route.push({
        orderIndex: route.length,
        locationName: place.name,
        locationAddress: place.address,
        locationType: place.type,
        latitude: place.lat,
        longitude: place.lng,
        activityTime: formatTime(currentTime),
        activityEndTime: formatTime(currentTime + place.estimatedDuration),
        estimatedDuration: place.estimatedDuration,
        travelTimeFromPrevious: travelTime,
        priority: place.priority,
        isAutoScheduled: true,
        description: '',
      });

      currentTime = addTime(currentTime, place.estimatedDuration);
      currentIndex = nearestIndex;
      visitedIndices.add(nearestIndex);
      remaining.splice(remaining.indexOf(nearestIndex), 1);
    }

    // Try to insert chill places
    const skippedPlaces: any[] = [];
    const chillStartIndex = mustGoPlaces.length + 1;
    
    for (let i = 0; i < chillPlaces.length; i++) {
      const chillIndex = chillStartIndex + i;
      const place = chillPlaces[i];
      
      // Find best insertion point
      let bestPosition = -1;
      let minExtraTime = Infinity;
      
      for (let j = 0; j < route.length; j++) {
        const prevIdx = j === 0 ? 0 : mustGoIndices[j - 1];
        const nextIdx = j < route.length ? mustGoIndices[j] : allLocations.length - 1;
        
        const extraTime = durations[prevIdx][chillIndex] + durations[chillIndex][nextIdx] - durations[prevIdx][nextIdx];
        const extraMinutes = Math.ceil(extraTime / 60);
        
        if (extraMinutes < minExtraTime) {
          minExtraTime = extraMinutes;
          bestPosition = j;
        }
      }
      
      // Only insert if detour is reasonable (< 20 minutes extra)
      if (minExtraTime < 20) {
        const insertTime = route[bestPosition]?.activityTime ? 
          parseTime(route[bestPosition].activityTime) - route[bestPosition].travelTimeFromPrevious :
          currentTime;
        
        const travelTime = Math.ceil(durations[currentIndex][chillIndex] / 60);
        
        route.splice(bestPosition, 0, {
          orderIndex: bestPosition,
          locationName: place.name,
          locationAddress: place.address,
          locationType: place.type,
          latitude: place.lat,
          longitude: place.lng,
          activityTime: formatTime(insertTime),
          activityEndTime: formatTime(insertTime + place.estimatedDuration),
          estimatedDuration: place.estimatedDuration,
          travelTimeFromPrevious: travelTime,
          priority: place.priority,
          isAutoScheduled: true,
          description: '',
        });
      } else {
        skippedPlaces.push({
          name: place.name,
          address: place.address,
          reason: `不顺路，会增加约 ${minExtraTime} 分钟行程`,
        });
      }
    }

    // Update order indices
    route.forEach((item, idx) => {
      item.orderIndex = idx;
    });

    // Calculate summary
    const totalDistance = distances[0].reduce((sum: number, dist: number, idx: number) => {
      if (visitedIndices.has(idx)) {
        return sum + dist;
      }
      return sum;
    }, 0) / 1000;

    const totalDrivingTime = route.reduce((sum, item) => sum + (item.travelTimeFromPrevious || 0), 0);
    const totalActivityTime = route.reduce((sum, item) => sum + item.estimatedDuration, 0);
    const estimatedEndTime = formatTime(currentTime);

    return new Response(
      JSON.stringify({
        success: true,
        optimizedRoute: route,
        skippedPlaces,
        summary: {
          totalDistance: totalDistance.toFixed(1),
          totalDrivingTime,
          totalActivityTime,
          estimatedEndTime,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error optimizing route:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

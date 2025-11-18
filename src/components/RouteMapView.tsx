import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';

interface RouteMapViewProps {
  locations: Array<{
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    orderIndex: number;
    locationType: string;
  }>;
  mapboxToken: string;
}

export function RouteMapView({ locations, mapboxToken }: RouteMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Filter valid locations with coordinates
    const validLocations = locations.filter(
      loc => loc.latitude !== null && loc.longitude !== null
    );

    if (validLocations.length === 0) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    // Calculate center and bounds
    const bounds = new mapboxgl.LngLatBounds();
    validLocations.forEach(loc => {
      bounds.extend([loc.longitude!, loc.latitude!]);
    });

    const center = bounds.getCenter();

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', async () => {
      if (!map.current) return;

      // Fetch and draw real driving routes
      setIsLoadingRoute(true);
      try {
        // Get directions from Mapbox Directions API
        const coordinates = validLocations.map(loc => `${loc.longitude},${loc.latitude}`).join(';');
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
        
        const response = await fetch(directionsUrl);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // Add route source
          map.current!.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                distance: route.distance,
                duration: route.duration,
              },
              geometry: route.geometry,
            },
          });

          // Add route line with shadow for better visibility
          map.current!.addLayer({
            id: 'route-shadow',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#000',
              'line-width': 8,
              'line-opacity': 0.2,
              'line-blur': 2,
            },
          });

          map.current!.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': 'hsl(var(--primary))',
              'line-width': 5,
              'line-opacity': 0.9,
            },
          });
        } else {
          // Fallback to simple line if directions API fails
          const coordinates = validLocations.map(loc => [loc.longitude!, loc.latitude!]);
          
          map.current!.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates,
              },
            },
          });

          map.current!.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': 'hsl(var(--primary))',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }
      } catch (error) {
        console.error('Error fetching directions:', error);
        // Fallback to simple line
        const coordinates = validLocations.map(loc => [loc.longitude!, loc.latitude!]);
        
        if (map.current) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates,
              },
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': 'hsl(var(--primary))',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }
      } finally {
        setIsLoadingRoute(false);
      }

      // Fit map to show all markers
      if (map.current) {
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 14,
          duration: 1000,
        });
      }
    });

    // Add markers
    validLocations.forEach((loc, index) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = index === 0 
        ? 'hsl(var(--primary))' 
        : index === validLocations.length - 1
        ? 'hsl(var(--destructive))'
        : 'hsl(var(--secondary))';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontSize = '12px';
      el.style.fontWeight = 'bold';
      el.textContent = (index + 1).toString();

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.longitude!, loc.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(
              `<div style="padding: 8px;">
                <strong>${loc.name}</strong><br/>
                <small>${loc.address}</small><br/>
                <span style="color: hsl(var(--primary));">${loc.locationType}</span>
              </div>`
            )
        )
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Cleanup
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [locations, mapboxToken]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      {isLoadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg flex items-center gap-2 z-10">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在计算最优路线...</span>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
            <span>起点</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--secondary))' }} />
            <span>途经</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
            <span>终点</span>
          </div>
        </div>
      </div>
    </div>
  );
}

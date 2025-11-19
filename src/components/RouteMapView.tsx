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
    isSkipped?: boolean;
  }>;
  mapboxToken: string;
}

export function RouteMapView({ locations, mapboxToken }: RouteMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // Early return if required dependencies are missing
    if (!mapContainer.current) return;
    
    if (!mapboxToken) {
      setMapError('正在加载地图配置...');
      return;
    }

    // Filter valid locations with coordinates
    const validLocations = locations.filter(
      loc => loc.latitude !== null && loc.longitude !== null
    );

    if (validLocations.length === 0) {
      setMapError('暂无有效地点信息');
      return;
    }

    // Clear any previous errors
    setMapError(null);

    // Separate reachable and skipped locations
    const reachableLocations = validLocations.filter(loc => !loc.isSkipped);
    const skippedLocations = validLocations.filter(loc => loc.isSkipped);

    try {
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

      // Fetch and draw real driving routes (only for reachable locations)
      setIsLoadingRoute(true);
      try {
        if (reachableLocations.length < 2) {
          // If only one location or less, just fit bounds without route
          setIsLoadingRoute(false);
          map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
          return;
        }

        // Get directions from Mapbox Directions API (only for reachable locations)
        const coordinates = reachableLocations.map(loc => `${loc.longitude},${loc.latitude}`).join(';');
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
        
        const response = await fetch(directionsUrl);
        
        if (!response.ok) {
          throw new Error(`Mapbox API error: ${response.status}`);
        }
        
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
          // Fallback to simple line if directions API fails (only for reachable locations)
          const coordinates = reachableLocations.map(loc => [loc.longitude!, loc.latitude!]);
          
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
        console.error('Error loading route:', error);
        setMapError('路线加载失败，将显示简化路线');
        
        // Fallback to simple line (only for reachable locations)
        const coordinates = reachableLocations.map(loc => [loc.longitude!, loc.latitude!]);
        
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
        
        // Clear error after showing fallback
        setTimeout(() => setMapError(null), 3000);
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

    // Add markers for reachable locations
    reachableLocations.forEach((loc, index) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = index === 0 
        ? 'hsl(var(--primary))' 
        : index === reachableLocations.length - 1
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

    // Add markers for skipped locations with special styling
    skippedLocations.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'custom-marker-skipped';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = 'hsl(var(--muted))';
      el.style.border = '3px solid hsl(var(--muted-foreground))';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'hsl(var(--muted-foreground))';
      el.style.fontSize = '16px';
      el.style.fontWeight = 'bold';
      el.textContent = '✕';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.longitude!, loc.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(
              `<div style="padding: 8px;">
                <strong>${loc.name}</strong><br/>
                <small>${loc.address}</small><br/>
                <span style="color: hsl(var(--muted-foreground));">${loc.locationType}</span><br/>
                <span style="color: hsl(var(--destructive)); font-weight: bold;">本次无法到达</span>
              </div>`
            )
        )
        .addTo(map.current!);

      markers.current.push(marker);
    });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('地图初始化失败，请刷新重试');
    }

    // Cleanup
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [locations, mapboxToken]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* 加载状态 */}
      {isLoadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg flex items-center gap-2 z-10">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在计算最优路线...</span>
        </div>
      )}

      {/* 错误提示 */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
          <div className="bg-background/95 backdrop-blur-sm px-6 py-4 rounded-lg border border-border shadow-lg text-center">
            <p className="text-sm text-muted-foreground">{mapError}</p>
          </div>
        </div>
      )}
      
      {/* 图例 */}
      {!mapError && (
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
      )}
    </div>
  );
}

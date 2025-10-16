import React, { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

const LocationMap = ({
  latitude,
  longitude,
  className = "",
  showCoordinates = true,
  height = "200px",
  responsive = true
}) => {
  const [mapError, setMapError] = useState(false);

  // Validate coordinates
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // ❌ REMOVED v0.7.13: Debug logging - caused excessive console spam
  // console.log('🗺️ LocationMap coordinates:', {...})

  if (isNaN(lat) || isNaN(lng)) {
    console.error('❌ Invalid coordinates:', { latitude, longitude, lat, lng });
    return (
      <div className={`bg-muted rounded-lg p-3 sm:p-4 text-center ${className}`} style={{ height }}>
        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs sm:text-sm text-muted-foreground">Invalid coordinates</p>
      </div>
    );
  }

  // ✅ CRITICAL FIX: Google Maps uses lat,lng format (NOT lng,lat)
  // Also ensure proper decimal precision (6 digits is standard)
  const latFormatted = lat.toFixed(6);
  const lngFormatted = lng.toFixed(6);

  // ✅ Use Google Maps iframe embed (not blocked by ad blockers when using embed URL)
  // Format: https://maps.google.com/maps?q=lat,lng&hl=th&z=16&output=embed
  const embedMapUrl = `https://maps.google.com/maps?q=${latFormatted},${lngFormatted}&hl=th&z=16&output=embed`;

  // Alternative: OpenStreetMap (backup option)
  // Note: OpenStreetMap uses lng,lat order (opposite of Google Maps)
  const openStreetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;

  // Generate Google Maps link for opening in new tab
  const mapsLink = `https://www.google.com/maps?q=${latFormatted},${lngFormatted}`;

  // ❌ REMOVED v0.7.13: Debug logging - caused excessive console spam
  // console.log('🗺️ Map URLs:', {...})

  // Handle map load error
  const handleMapError = () => {
    setMapError(true);
  };

  return (
    <div className={`space-y-1 sm:space-y-2 ${className}`}>
      {/* Map Display */}
      <div
        className={`relative rounded-lg overflow-hidden border border-border bg-muted ${
          responsive
            ? 'w-full h-[160px] sm:h-[200px] md:h-[250px] lg:h-[300px]'
            : ''
        }`}
        style={responsive ? {} : { height }}
      >
        {!mapError ? (
          <>
            {/* ✅ Use Google Maps embed iframe (works with ad blockers when using embed URL) */}
            <iframe
              src={embedMapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              title={`แผนที่แสดงตำแหน่ง ${lat}, ${lng}`}
              onError={handleMapError}
            />

            {/* Overlay for click to open */}
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors group"
              title="Click to open in Google Maps"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-800 shadow-lg flex items-center gap-1 sm:gap-2">
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Open in Google Maps</span>
                <span className="sm:hidden">Open</span>
              </div>
            </a>
          </>
        ) : (
          // Fallback display when map fails to load
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="text-center space-y-2 sm:space-y-3 p-2">
              <div className="relative">
                <MapPin className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-blue-600 dark:text-blue-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 break-all">
                  Location: {lat.toFixed(4)}, {lng.toFixed(4)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Map preview unavailable
                </p>
              </div>
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">View in Google Maps</span>
                <span className="sm:hidden">View</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Coordinates Display */}
      {showCoordinates && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>Coordinates:</span>
          </div>
          <div className="font-mono text-xs break-all">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
};

export { LocationMap };
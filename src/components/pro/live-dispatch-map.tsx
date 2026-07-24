'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { MapPinned } from 'lucide-react'

type Stop = {
  id: string
  sequence: number
  scheduledAt: string
  type: string
  priority: string
  location: { latitude: number; longitude: number } | null
  client: { firstName: string; lastName: string; companyName: string | null; city: string | null }
  pool: { name: string } | null
}

type Technician = {
  userId: string
  name: string
  color: string
  location: {
    latitude: number
    longitude: number
    freshness: 'live' | 'stale' | 'offline'
  } | null
  route: Stop[]
}

type Props = {
  technicians: Technician[]
  selectedUserId: string | null
  missingKeyLabel: string
}

declare global {
  interface Window {
    google?: any
    __aqweliaGoogleMapsPromise?: Promise<void>
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  if (window.__aqweliaGoogleMapsPromise) return window.__aqweliaGoogleMapsPromise
  window.__aqweliaGoogleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
  return window.__aqweliaGoogleMapsPromise
}

export function LiveDispatchMap({ technicians, selectedUserId, missingKeyLabel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const directionsRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey || !hostRef.current) return
    let cancelled = false
    void loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !hostRef.current || !window.google?.maps) return
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(hostRef.current, {
            center: { lat: 43.2965, lng: 5.3698 },
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: 'greedy',
            styles: [
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            ],
          })
        }
        setError(null)
      })
      .catch(() => setError('Google Maps unavailable'))
    return () => { cancelled = true }
  }, [apiKey])

  useEffect(() => {
    const google = window.google
    const map = mapRef.current
    if (!google?.maps || !map) return

    for (const marker of markersRef.current) marker.setMap(null)
    for (const renderer of directionsRef.current) renderer.setMap(null)
    for (const polyline of polylinesRef.current) polyline.setMap(null)
    markersRef.current = []
    directionsRef.current = []
    polylinesRef.current = []

    const bounds = new google.maps.LatLngBounds()
    const visible = selectedUserId
      ? technicians.filter((technician) => technician.userId === selectedUserId)
      : technicians

    for (const technician of visible) {
      if (technician.location) {
        const position = { lat: technician.location.latitude, lng: technician.location.longitude }
        const marker = new google.maps.Marker({
          map,
          position,
          title: technician.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: technician.color,
            fillOpacity: technician.location.freshness === 'offline' ? 0.35 : 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          label: { text: technician.name.slice(0, 1).toUpperCase(), color: '#ffffff', fontWeight: '700' },
          zIndex: 100,
        })
        markersRef.current.push(marker)
        bounds.extend(position)
      }

      if (!selectedUserId) continue
      const stops = technician.route.filter((stop) => stop.location)
      for (const stop of stops) {
        const position = { lat: stop.location!.latitude, lng: stop.location!.longitude }
        const marker = new google.maps.Marker({
          map,
          position,
          title: `${stop.sequence}. ${stop.client.companyName || `${stop.client.firstName} ${stop.client.lastName}`}`,
          label: { text: String(stop.sequence), color: '#ffffff', fontWeight: '800' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: stop.priority === 'urgent' ? '#dc2626' : technician.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        })
        markersRef.current.push(marker)
        bounds.extend(position)
      }

      const origin = technician.location
      if (origin && stops.length > 0) {
        const destination = stops[stops.length - 1].location!
        const waypoints = stops.slice(0, -1).map((stop) => ({
          location: { lat: stop.location!.latitude, lng: stop.location!.longitude },
          stopover: true,
        }))
        const service = new google.maps.DirectionsService()
        const renderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: { strokeColor: technician.color, strokeOpacity: 0.82, strokeWeight: 5 },
        })
        directionsRef.current.push(renderer)
        service.route({
          origin: { lat: origin.latitude, lng: origin.longitude },
          destination: { lat: destination.latitude, lng: destination.longitude },
          waypoints,
          optimizeWaypoints: false,
          travelMode: google.maps.TravelMode.DRIVING,
        }).then((result: unknown) => renderer.setDirections(result)).catch(() => {
          renderer.setMap(null)
          const path = [
            { lat: origin.latitude, lng: origin.longitude },
            ...stops.map((stop) => ({ lat: stop.location!.latitude, lng: stop.location!.longitude })),
          ]
          const polyline = new google.maps.Polyline({
            map,
            path,
            strokeColor: technician.color,
            strokeOpacity: 0.65,
            strokeWeight: 4,
          })
          polylinesRef.current.push(polyline)
        })
      }
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, 70)
  }, [selectedUserId, technicians])

  if (!apiKey) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-primary/30 bg-secondary/30 p-8 text-center">
        <MapPinned className="mb-4 h-10 w-10 text-primary" />
        <p className="max-w-md text-sm font-semibold text-foreground">{missingKeyLabel}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[1.75rem] border border-border/60 bg-secondary/30">
      <div ref={hostRef} className="absolute inset-0" />
      {error ? (
        <div className="absolute inset-x-4 top-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {error}
        </div>
      ) : null}
    </div>
  )
}

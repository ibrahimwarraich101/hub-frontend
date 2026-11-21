// File purpose: Choosing the exact spot of a delivery address: an OpenStreetMap map (free, no key) where the person drags
// the pin or taps the map, plus "Use my current location", which asks the browser for the device's position.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Position = { latitude: number; longitude: number }

type Props = {
  value: Position
  onChange: (position: Position) => void
}

// A simple round pin drawn with CSS, so no image files are needed.
const pinIcon = L.divIcon({ className: 'ac-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] })

const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000

export function LocationPicker({ value, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const changeRef = useRef(onChange)
  const [locating, setLocating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => { changeRef.current = onChange }, [onChange])

  // Create the map once.
  useEffect(() => {
    if (!box.current || map.current) return
    const start: L.LatLngTuple = [value.latitude, value.longitude]
    const created = L.map(box.current, { scrollWheelZoom: false }).setView(start, 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(created)
    const pin = L.marker(start, { draggable: true, icon: pinIcon, keyboard: true, title: 'Delivery location' }).addTo(created)
    const report = (point: L.LatLng) => changeRef.current({ latitude: round(point.lat), longitude: round(point.lng) })
    pin.on('dragend', () => report(pin.getLatLng()))
    created.on('click', (event: L.LeafletMouseEvent) => { pin.setLatLng(event.latlng); report(event.latlng) })
    map.current = created
    marker.current = pin
    return () => { created.remove(); map.current = null; marker.current = null }
    // The starting position is only needed once; later changes move the pin below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the pin where the form says (e.g. after "Use my current location").
  useEffect(() => {
    const pin = marker.current
    if (!pin) return
    const here = pin.getLatLng()
    if (round(here.lat) !== value.latitude || round(here.lng) !== value.longitude) {
      pin.setLatLng([value.latitude, value.longitude])
      map.current?.setView([value.latitude, value.longitude], Math.max(map.current.getZoom(), 16))
    }
  }, [value.latitude, value.longitude])

  function useMyLocation() {
    if (!('geolocation' in navigator)) { setProblem('This browser cannot share its location. Drag the pin instead.'); return }
    setLocating(true)
    setProblem(null)
    navigator.geolocation.getCurrentPosition(
      (found) => {
        setLocating(false)
        changeRef.current({ latitude: round(found.coords.latitude), longitude: round(found.coords.longitude) })
      },
      (error) => {
        setLocating(false)
        setProblem(error.code === error.PERMISSION_DENIED
          ? 'Location is blocked for this website. Allow it in the browser, or drag the pin on the map.'
          : 'Your location could not be found. Drag the pin on the map instead.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  return (
    <div className="ac-location">
      <div className="ac-location-head">
        <span>Delivery location</span>
        <button type="button" className="sx-button" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Finding you…' : 'Use my current location'}
        </button>
      </div>
      <div ref={box} className="ac-map" role="application" aria-label="Map: drag the pin or tap the map to set the delivery location" />
      <p className="ac-hint">Drag the pin, or tap the map, to the exact door. Riders use this spot.</p>
      {problem && <p className="ac-error" role="alert">{problem}</p>}
    </div>
  )
}

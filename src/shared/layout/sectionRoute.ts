// File purpose: Keeps the place inside a HUB section (#store/..., #food/..., #bills/..., #restaurant/..., #food-admin/...) in the
// address bar, so Refresh reopens the same screen and the browser's Back/Forward buttons move between screens.
// Each entry a section adds is marked with its depth, so an in-page Back button knows whether going back stays inside the section.
// (Started as HUB Food's foodRoute.ts; shared so every module navigates the same way.)
import { useEffect } from 'react'

type SectionHistory = { hubDepth?: number } | null

// The part after "#<section>/" (for example "order/<id>"), "" for the section itself, or null for another place.
export function sectionPath(section: string): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash === section) return ''
  return hash.startsWith(section + '/') ? hash.slice(section.length + 1) : null
}

// How many addresses deep the current history entry is inside its section (1 = the first screen).
export function sectionDepth(): number {
  return (history.state as SectionHistory)?.hubDepth ?? 1
}

// Called when a section opens: adds its address (so Back returns to the HUB home) unless it is already there.
export function enterSection(section: string, path: string) {
  if (sectionPath(section) === null) history.pushState({ hubDepth: 1 }, '', '#' + join(section, path))
  else if (!(history.state as SectionHistory)?.hubDepth) history.replaceState({ hubDepth: 1 }, '', window.location.hash)
}

// Moves to another screen of the section. replace: change the current entry instead of adding one (tabs, redirects).
export function goTo(section: string, path: string, replace = false) {
  const depth = sectionDepth()
  const url = '#' + join(section, path)
  if (replace) history.replaceState({ hubDepth: depth }, '', url)
  else history.pushState({ hubDepth: depth + 1 }, '', url)
}

// Leaves the section: clears the address so a refresh opens the HUB home.
export function leaveSection() {
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
}

// Follows the browser's Back/Forward buttons: onChange gets the new path, or null when the address left the section.
export function useSectionHistory(section: string, onChange: (path: string | null) => void) {
  useEffect(() => {
    const follow = () => onChange(sectionPath(section))
    window.addEventListener('popstate', follow)
    return () => window.removeEventListener('popstate', follow)
  }, [section, onChange])
}

function join(section: string, path: string) {
  return path ? `${section}/${path}` : section
}

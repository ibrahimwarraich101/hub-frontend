// File purpose: Keeps the place inside a HUB Food screen in the address bar (#food/..., #restaurant/..., #food-admin/...),
// so Refresh reopens the same screen and the browser's Back/Forward buttons move between Food screens (same idea as the
// admin portal's #admin/... addresses). Each entry Food adds is marked with its depth, so an in-page Back button knows
// whether going back stays inside Food.
import { useEffect } from 'react'

type FoodHistory = { hubFood?: number } | null

// The part after "#<section>/" (for example "order/<id>"), "" for the section itself, or null for another place.
export function sectionPath(section: string): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash === section) return ''
  return hash.startsWith(section + '/') ? hash.slice(section.length + 1) : null
}

// How many Food addresses deep the current history entry is (1 = the first Food screen).
export function foodDepth(): number {
  return (history.state as FoodHistory)?.hubFood ?? 1
}

// Called when a section opens: adds its address (so Back returns to the HUB home) unless it is already there.
export function enterSection(section: string, path: string) {
  if (sectionPath(section) === null) history.pushState({ hubFood: 1 }, '', '#' + join(section, path))
  else if (!(history.state as FoodHistory)?.hubFood) history.replaceState({ hubFood: 1 }, '', window.location.hash)
}

// Moves to another screen of the section. replace: change the current entry instead of adding one (tabs, redirects).
export function goTo(section: string, path: string, replace = false) {
  const depth = foodDepth()
  const url = '#' + join(section, path)
  if (replace) history.replaceState({ hubFood: depth }, '', url)
  else history.pushState({ hubFood: depth + 1 }, '', url)
}

// Leaves the section: clears the address so a refresh opens the HUB home.
export function leaveSection() {
  history.replaceState(null, '', window.location.pathname + window.location.search)
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

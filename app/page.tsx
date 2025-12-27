'use client'

import { useState, useEffect, useMemo } from 'react'
import { Globe3D } from '@/components/Globe/Globe3D'
import { EventsSidebar } from '@/components/EventsList/EventsSidebar'
import { CountryDropdown } from '@/components/CountryDropdown'
import { getCountriesWithCounts, getEventsByCountry } from '@/lib/queries'
import { detectUserCountry } from '@/lib/geolocation'
import type { Event, CountryWithCount } from '@/types/events'

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [countries, setCountries] = useState<CountryWithCount[]>([])
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load countries and detect user location on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load countries with counts
        const countriesData = await getCountriesWithCounts()
        setCountries(countriesData)

        // Detect user's country
        const detectedCountry = await detectUserCountry()
        if (detectedCountry) {
          // Try to match detected country with countries in database
          const matchedCountry = countriesData.find(
            (c) => c.country.toLowerCase() === detectedCountry.toLowerCase()
          )
          if (matchedCountry) {
            setUserCountry(matchedCountry.country)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Load events when country is selected
  useEffect(() => {
    if (selectedCountry) {
      const country = selectedCountry // Narrow type to string
      async function loadEvents() {
        try {
          const countryEvents = await getEventsByCountry(country)
          setEvents(countryEvents)
        } catch (error) {
          console.error('Error loading events:', error)
          setEvents([])
        }
      }
      loadEvents()
    } else {
      setEvents([])
    }
  }, [selectedCountry])

  // Get list of countries that have events
  const countriesWithEvents = useMemo(
    () => countries.map((c) => c.country),
    [countries]
  )

  const handleCountrySelect = (country: string | null) => {
    setSelectedCountry(country)
  }

  const handleCloseSidebar = () => {
    setSelectedCountry(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading globe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header - Centered above globe */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center pt-6">
        <div className="text-center">
          <h1 className="text-5xl text-slate-900" style={{ fontFamily: "'Cahuenga', serif" }}>
            ETH Events Explorer
          </h1>
          
        </div>
      </header>

      {/* Globe Container */}
      <div className="h-full w-full">
        <Globe3D
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
          userCountry={userCountry}
          countriesWithEvents={countriesWithEvents}
          countries={countries}
          events={events}
        />
      </div>

      {/* Events Sidebar */}
      <EventsSidebar
        isOpen={!!selectedCountry}
        country={selectedCountry}
        events={events}
        onClose={handleCloseSidebar}
      />

      {/* Country Dropdown */}
      <CountryDropdown
        countries={countries}
        selectedCountry={selectedCountry}
        userCountry={userCountry}
        onSelect={handleCountrySelect}
      />

      {/* User Country Indicator */}
      {userCountry && !selectedCountry && (
        <div className="absolute top-20 right-6 z-30 rounded-lg bg-background/95 backdrop-blur-sm border border-border p-3 shadow-lg">
          <p className="text-xs text-muted-foreground">Your location</p>
          <p className="font-semibold text-foreground">{userCountry}</p>
        </div>
      )}
    </div>
  )
}

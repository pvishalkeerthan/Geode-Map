import { supabase } from './supabase'
import type { Event, CountryWithCount } from '@/types/events'

export async function getCountriesWithCounts(): Promise<CountryWithCount[]> {
  const { data, error } = await supabase
    .from('v_events_ethstars')
    .select('country')

  if (error) {
    console.error('Error fetching countries:', error)
    return []
  }

  // Group by country and count
  const countryMap = new Map<string, number>()
  
  data?.forEach((item) => {
    if (item.country) {
      const current = countryMap.get(item.country) || 0
      countryMap.set(item.country, current + 1)
    }
  })

  return Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => a.country.localeCompare(b.country))
}

export async function getEventsByCountry(country: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('v_events_ethstars')
    .select('*')
    .eq('country', country)
    .order('startTime', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return (data || []) as Event[]
}

export async function getAllEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('v_events_ethstars')
    .select('*')
    .order('startTime', { ascending: true })

  if (error) {
    console.error('Error fetching all events:', error)
    return []
  }

  return (data || []) as Event[]
}


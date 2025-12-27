export interface Event {
  id: string
  title: string
  logoImage: string | null
  bannerImage: string | null
  startTime: string
  endTime: string
  location: string | null
  country: string | null
  link: string | null
  tags: string[] | null
  highlight: boolean
  discord: string | null
  telegram: string | null
  twitter: string | null
  farcaster: string | null
  ecosystemfocus: string | null
  season: string | null
}

export interface CountryWithCount {
  country: string
  count: number
}


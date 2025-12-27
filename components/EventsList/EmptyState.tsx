'use client'

import { Globe, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  country: string
}

export function EmptyState({ country }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-6">
        <Globe className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        No upcoming events in {country} yet
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        There are no upcoming blockchain events scheduled in this region. Check back later or explore other regions.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        <Search className="mr-2 h-4 w-4" />
        Explore other regions
      </Button>
    </div>
  )
}


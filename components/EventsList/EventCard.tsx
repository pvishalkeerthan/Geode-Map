'use client'

import Image from 'next/image'
import { ExternalLink, Calendar, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Event } from '@/types/events'

interface EventCardProps {
  event: Event
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  const startFormatted = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  
  const endFormatted = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (startDate.getTime() === endDate.getTime()) {
    return startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return `${startFormatted} - ${endFormatted}`
}

export function EventCard({ event }: EventCardProps) {
  const handleCardClick = () => {
    if (event.link) {
      window.open(event.link, '_blank', 'noopener,noreferrer')
    }
  }

  const displayTags = event.tags?.slice(0, 3) || []
  const remainingTags = (event.tags?.length || 0) - displayTags.length

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Event Logo */}
          <div className="flex-shrink-0">
            {event.logoImage ? (
              <Image
                src={event.logoImage}
                alt={event.title}
                width={64}
                height={64}
                className="rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              {event.highlight && (
                <Badge variant="default" className="flex-shrink-0">
                  Featured
                </Badge>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDateRange(event.startTime, event.endTime)}</span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {displayTags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
                {remainingTags > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{remainingTags} more
                  </Badge>
                )}
              </div>
            )}

            {/* External Link Button */}
            {event.link && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(event.link!, '_blank', 'noopener,noreferrer')
                  }}
                >
                  View Event
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


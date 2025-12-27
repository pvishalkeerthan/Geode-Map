'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventCard } from './EventCard'
import { EmptyState } from './EmptyState'
import type { Event } from '@/types/events'

interface EventsSidebarProps {
  isOpen: boolean
  country: string | null
  events: Event[]
  onClose: () => void
}

export function EventsSidebar({
  isOpen,
  country,
  events,
  onClose,
}: EventsSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && country && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed left-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-background/95 backdrop-blur-sm border-r border-border shadow-xl md:w-96"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Explore Events in {country}
              </h2>
              <p className="text-sm text-muted-foreground">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6">
            {events.length === 0 ? (
              <EmptyState country={country} />
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


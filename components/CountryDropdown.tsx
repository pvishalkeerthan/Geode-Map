'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CountryWithCount } from '@/types/events'

interface CountryDropdownProps {
  countries: CountryWithCount[]
  selectedCountry: string | null
  userCountry: string | null
  onSelect: (country: string | null) => void
}

export function CountryDropdown({
  countries,
  selectedCountry,
  userCountry,
  onSelect,
}: CountryDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:bottom-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between bg-background/95 backdrop-blur-sm border-border shadow-lg hover:bg-background/100 md:w-[400px]"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="truncate">
                {selectedCountry
                  ? countries.find((c) => c.country === selectedCountry)
                      ?.country || 'Select country...'
                  : 'Select a country...'}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 md:w-[400px]">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                <AnimatePresence>
                  {countries.map((country) => {
                    const isSelected = selectedCountry === country.country
                    const isUserCountry = userCountry === country.country

                    return (
                      <CommandItem
                        key={country.country}
                        value={country.country}
                        onSelect={() => {
                          onSelect(isSelected ? null : country.country)
                          setOpen(false)
                        }}
                        className={cn(
                          'cursor-pointer',
                          isUserCountry && 'bg-amber-50 dark:bg-amber-950/20'
                        )}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-1 items-center justify-between">
                          <span className="truncate">{country.country}</span>
                          {isUserCountry && (
                            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                              (You)
                            </span>
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({country.count})
                          </span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </AnimatePresence>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}


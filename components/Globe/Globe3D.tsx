'use client'

import { useMemo, useState, useRef, useEffect, Component, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { feature } from 'topojson-client'
import type { Event } from '@/types/events'
import * as THREE from 'three'

// Error Boundary to catch WebGPU errors
class GlobeErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Globe error:', error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error)
    }
  }

  render() {
    if (this.state.hasError) {
      const isWebGPUError = this.state.error?.message?.includes('WebGPU') || 
                           this.state.error?.message?.includes('GPUShaderStage')
      
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center p-4">
            <div className="text-red-600 mb-2">Error loading globe</div>
            <div className="text-sm text-muted-foreground">
              {isWebGPUError 
                ? 'WebGPU is not supported on this device. Please use a browser with WebGL support.'
                : this.state.error?.message || 'Failed to render globe'}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Try refreshing the page or using a different browser.
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Force WebGL instead of WebGPU for mobile compatibility
// This must run before any Three.js or react-globe.gl imports
if (typeof window !== 'undefined') {
  // Patch navigator.gpu to return undefined, forcing WebGL fallback
  try {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      (window as any).navigator || {},
      'gpu'
    )
    
    if (!originalDescriptor || originalDescriptor.configurable) {
      Object.defineProperty((window as any).navigator, 'gpu', {
        get: () => undefined,
        configurable: true,
        enumerable: false,
      })
    }
  } catch (e) {
    // If we can't override navigator.gpu, that's okay
    // We'll handle it through error boundaries and fallbacks
  }
  
  // Polyfill GPUShaderStage to prevent errors when WebGPU code tries to access it
  // This prevents "undefined is not an object (evaluating 'GPUShaderStage.VERTEX')" errors
  if (!(window as any).GPUShaderStage) {
    (window as any).GPUShaderStage = {
      VERTEX: 1,
      FRAGMENT: 2,
      COMPUTE: 4,
    }
  }
  
  // Also ensure WebGPU requestAdapter returns null/undefined
  if ((window as any).navigator?.gpu) {
    const originalRequestAdapter = (window as any).navigator.gpu.requestAdapter
    if (originalRequestAdapter) {
      (window as any).navigator.gpu.requestAdapter = async () => {
        return null // Force fallback to WebGL
      }
    }
  }
}

// Dynamically import Globe to avoid SSR issues
// Wrap in error boundary to catch WebGPU errors
const Globe = dynamic(
  () => {
    // Ensure WebGPU is disabled before importing
    if (typeof window !== 'undefined') {
      try {
        if ((window as any).navigator?.gpu) {
          Object.defineProperty((window as any).navigator, 'gpu', {
            get: () => undefined,
            configurable: true,
          })
        }
      } catch (e) {
        // Ignore
      }
    }
    return import('react-globe.gl')
  },
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading globe...</div>
      </div>
    ),
  }
)

interface Globe3DProps {
  selectedCountry: string | null
  onCountrySelect: (country: string | null) => void
  userCountry: string | null
  countriesWithEvents: string[]
  countries: Array<{ country: string; count: number }>
  events: Event[]
}

export function Globe3D({
  selectedCountry,
  onCountrySelect,
  userCountry,
  countriesWithEvents,
  countries,
  events,
}: Globe3DProps) {
  const [countriesData, setCountriesData] = useState<any[]>([])
  const [globeReady, setGlobeReady] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const globeRef = useRef<any>(null)
  
  // Ensure WebGL is preferred on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Double-check WebGPU is disabled
      try {
        if ((window as any).navigator?.gpu) {
          Object.defineProperty((window as any).navigator, 'gpu', {
            get: () => undefined,
            configurable: true,
          })
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [])

  // Load countries GeoJSON and convert from TopoJSON
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((res) => res.json())
      .then((topology) => {
        // Convert TopoJSON to GeoJSON
        const countries = feature(topology, topology.objects.countries)
        setCountriesData(countries.features || [])
        setGlobeReady(true)
      })
      .catch((err) => {
        console.error('Error loading countries data:', err)
        setGlobeReady(true)
      })
  }, [])

  // Color function for countries
  const getPolygonColor = useMemo(() => {
    return (d: any) => {
      const countryName = d.properties?.NAME || d.properties?.name
      
      if (selectedCountry === countryName) {
        return '#f1dbcf' // Light beige/peach - selected
      }
      if (userCountry === countryName) {
        return '#F59E0B' // Warm gold - user's country
      }
      if (countriesWithEvents.includes(countryName)) {
        return '#ffffff' // White - has events
      }
      return '#ffffff' // White - default
    }
  }, [selectedCountry, userCountry, countriesWithEvents])

  // Create a uniform blue texture (no lighting gradient) - MUST be before early return
  const uniformBlueTexture = useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Fill with uniform light blue-gray color - no gradient
      ctx.fillStyle = '#9eb0cc' // Light blue-gray
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    
    return canvas.toDataURL()
  }, [])

  // Handle country click
  const handlePolygonClick = (polygon: any) => {
    const countryName = polygon.properties?.NAME || polygon.properties?.name
    if (countryName) {
      onCountrySelect(countryName === selectedCountry ? null : countryName)
    }
  }

  // Force WebGL renderer instead of WebGPU for mobile compatibility
  const configureRenderer = () => {
    if (!globeRef.current || typeof window === 'undefined') return
    
    try {
      const globe = globeRef.current
      
      // Access the internal globe instance
      const globeInstance = (globe as any).__globe || globe
      
      // Try to access renderer through various methods
      let renderer: any = null
      
      if (globeInstance.renderer) {
        renderer = globeInstance.renderer
      } else if (globe.renderer) {
        renderer = globe.renderer
      }
      
      // If we have a renderer, ensure it's WebGL
      if (renderer) {
        // Check if it's a WebGL renderer
        if (renderer instanceof THREE.WebGLRenderer) {
          // Good, it's already WebGL
          return
        }
        
        // If it's trying to use WebGPU, we need to replace it
        // This is tricky because react-globe.gl manages the renderer
        // But we can at least log a warning
        console.warn('Renderer is not WebGL, but react-globe.gl manages renderer creation')
      }
      
      // Alternative: Check the canvas context directly
      // Find the canvas element in the globe container
      const container = globeRef.current as any
      if (container && container.parentElement) {
        const canvas = container.parentElement.querySelector?.('canvas') || 
                      container.querySelector?.('canvas')
        
        if (canvas) {
          // Check what context is being used
          const webglContext = canvas.getContext('webgl2') || canvas.getContext('webgl')
          const webgpuContext = (canvas as any).getContext?.('webgpu')
          
          if (webgpuContext && !webglContext) {
            console.error('WebGPU context detected but WebGL not available - this will cause errors on mobile')
          } else if (webglContext) {
            // Good, WebGL is being used
            return
          }
        }
      }
    } catch (error) {
      console.warn('Error configuring renderer:', error)
    }
  }

  // Disable lighting on globe material for uniform appearance
  const disableGlobeLighting = () => {
    if (!globeRef.current) return
    
    const globe = globeRef.current
    // Try different ways to access the scene
    let scene: THREE.Scene | null = null
    
    // Method 1: Direct scene access
    if (globe.scene && globe.scene instanceof THREE.Scene) {
      scene = globe.scene
    }
    // Method 2: Scene as function
    else if (typeof globe.scene === 'function') {
      scene = globe.scene()
    }
    // Method 3: Through renderer
    else if (globe.renderer && globe.renderer.scene) {
      scene = globe.renderer.scene
    }
    // Method 4: Access through __globe property (internal react-globe.gl structure)
    else if ((globe as any).__globe && (globe as any).__globe.scene) {
      scene = (globe as any).__globe.scene
    }
    
    if (scene) {
      scene.traverse((object: any) => {
        if (object.isMesh && object.material) {
          // Make material non-lighting (MeshBasicMaterial) so it doesn't respond to lighting
          // This creates uniform lighting across the entire globe
          if (Array.isArray(object.material)) {
            object.material = object.material.map((mat: any) => {
              if (mat.isMeshStandardMaterial || mat.isMeshPhongMaterial || mat.isMeshLambertMaterial) {
                // Convert to MeshBasicMaterial for uniform lighting
                const basicMat = new THREE.MeshBasicMaterial()
                if (mat.map) basicMat.map = mat.map
                if (mat.color) basicMat.color.copy(mat.color)
                basicMat.transparent = mat.transparent !== undefined ? mat.transparent : false
                basicMat.opacity = mat.opacity !== undefined ? mat.opacity : 1
                return basicMat
              }
              return mat
            })
          } else {
            if (object.material.isMeshStandardMaterial || object.material.isMeshPhongMaterial || object.material.isMeshLambertMaterial) {
              // Convert to MeshBasicMaterial for uniform lighting
              const basicMat = new THREE.MeshBasicMaterial()
              if (object.material.map) basicMat.map = object.material.map
              if (object.material.color) basicMat.color.copy(object.material.color)
              basicMat.transparent = object.material.transparent !== undefined ? object.material.transparent : false
              basicMat.opacity = object.material.opacity !== undefined ? object.material.opacity : 1
              object.material = basicMat
            }
          }
        }
      })
    }
  }

  // Handle globe ready callback
  const handleGlobeReady = () => {
    // Small delay to ensure scene is fully initialized
    setTimeout(() => {
      // First, configure renderer to use WebGL (not WebGPU)
      configureRenderer()
      // Then disable lighting
      disableGlobeLighting()
    }, 100)
  }

  // Also try to disable lighting after a delay in case onGlobeReady doesn't fire
  useEffect(() => {
    if (globeReady && globeRef.current) {
      const timeoutId = setTimeout(() => {
        disableGlobeLighting()
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [globeReady])

  if (!globeReady) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading globe...</div>
      </div>
    )
  }

  if (renderError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-600 mb-2">Error loading globe</div>
          <div className="text-sm text-muted-foreground">{renderError}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Your device may not support WebGL. Please try a different browser.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <GlobeErrorBoundary
        onError={(error) => {
          if (error.message?.includes('WebGPU') || error.message?.includes('GPUShaderStage')) {
            setRenderError('WebGPU is not supported on this device. Please use a browser with WebGL support.')
          } else {
            setRenderError(error.message || 'Failed to render globe')
          }
        }}
      >
        <Globe
        ref={globeRef}
        globeImageUrl={uniformBlueTexture || undefined}
        backgroundImageUrl={null}
        polygonsData={countriesData}
        polygonAltitude={0.01}
        polygonCapColor={getPolygonColor}
        polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
        polygonStrokeColor={() => {
          return '#000000' // Black borders for all countries
        }}
        polygonLabel={(d: any) => {
          const countryName = d.properties?.NAME || d.properties?.name
          // Find the country in the countries array to get the event count
          const countryData = countries.find((c) => c.country === countryName)
          const eventCount = countryData?.count || 0
          return `
            <div style="padding: 8px; background: rgba(255,255,255,0.95); color: #1e293b; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
              <b>${countryName}</b><br/>
              ${eventCount} ${eventCount === 1 ? 'event' : 'events'}
            </div>
          `
        }}
        onPolygonClick={handlePolygonClick}
        onPolygonHover={(polygon: any) => {
          if (polygon) {
            document.body.style.cursor = 'pointer'
          } else {
            document.body.style.cursor = 'default'
          }
        }}
        onGlobeReady={handleGlobeReady}
        enablePointerInteraction={true}
        showAtmosphere={false}
        showGlobe={true}
        showGraticules={false}
        backgroundColor="rgba(241, 245, 249, 0)"
        />
      </GlobeErrorBoundary>
    </div>
  )
}


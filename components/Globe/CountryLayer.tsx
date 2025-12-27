'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { feature } from 'topojson-client'

// World countries GeoJSON from CDN
const WORLD_JSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface CountryLayerProps {
  selectedCountry: string | null
  hoveredCountry: string | null
  userCountry: string | null
  countriesWithEvents: string[]
  onCountrySelect: (country: string | null) => void
  onCountryHover: (country: string | null) => void
}

// Helper function to convert lat/lon to 3D coordinates on sphere
function latLonToVector3(lat: number, lon: number, radius: number = 1) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

export function CountryLayer({
  selectedCountry,
  hoveredCountry,
  userCountry,
  countriesWithEvents,
  onCountrySelect,
  onCountryHover,
}: CountryLayerProps) {
  const [worldData, setWorldData] = useState<any>(null)
  const countryMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const { camera, raycaster: sceneRaycaster } = useThree()
  const mouse = useMemo(() => new THREE.Vector2(), [])

  // Load world GeoJSON data
  useEffect(() => {
    fetch(WORLD_JSON_URL)
      .then((res) => res.json())
      .then((data) => {
        const countries = feature(data, data.objects.countries)
        setWorldData(countries)
      })
      .catch((err) => {
        console.error('Error loading world data:', err)
        setWorldData({ type: 'FeatureCollection', features: [] })
      })
  }, [])

  // Create country line geometries from GeoJSON
  const countryLines = useMemo(() => {
    if (!worldData) return []

    const lines: Array<{
      name: string
      points: THREE.Vector3[]
    }> = []

    worldData.features?.forEach((feature: any) => {
      const countryName = feature.properties?.NAME || feature.properties?.name
      if (!countryName) return

      const coordinates = feature.geometry?.coordinates || []
      const points: THREE.Vector3[] = []

      // Handle different geometry types
      const processCoordinates = (coords: any[]) => {
        if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
          // Simple coordinate array
          coords.forEach(([lon, lat]: [number, number]) => {
            points.push(latLonToVector3(lat, lon))
          })
        } else {
          // Nested arrays (MultiPolygon, etc.)
          coords.forEach((coord: any) => {
            if (Array.isArray(coord[0]) && typeof coord[0][0] === 'number') {
              coord.forEach(([lon, lat]: [number, number]) => {
                points.push(latLonToVector3(lat, lon))
              })
            } else {
              processCoordinates(coord)
            }
          })
        }
      }

      if (feature.geometry.type === 'Polygon') {
        coordinates.forEach(processCoordinates)
      } else if (feature.geometry.type === 'MultiPolygon') {
        coordinates.forEach((polygon: any) => {
          polygon.forEach(processCoordinates)
        })
      }

      if (points.length > 0) {
        lines.push({ name: countryName, points })
      }
    })

    return lines
  }, [worldData])

  // Handle interactions
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      sceneRaycaster.setFromCamera(mouse, camera)

      const meshes = Array.from(countryMeshesRef.current.values())
      const intersects = sceneRaycaster.intersectObjects(meshes)

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh
        const countryName = Array.from(countryMeshesRef.current.entries()).find(
          ([_, mesh]) => mesh === clickedMesh
        )?.[0]

        if (countryName) {
          onCountrySelect(countryName)
        }
      } else {
        onCountrySelect(null)
      }
    }

    const handleMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      sceneRaycaster.setFromCamera(mouse, camera)

      const meshes = Array.from(countryMeshesRef.current.values())
      const intersects = sceneRaycaster.intersectObjects(meshes)

      if (intersects.length > 0) {
        const hoveredMesh = intersects[0].object as THREE.Mesh
        const countryName = Array.from(countryMeshesRef.current.entries()).find(
          ([_, mesh]) => mesh === hoveredMesh
        )?.[0]

        onCountryHover(countryName || null)
      } else {
        onCountryHover(null)
      }
    }

    window.addEventListener('click', handleClick)
    window.addEventListener('mousemove', handleMove)

    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('mousemove', handleMove)
    }
  }, [camera, sceneRaycaster, mouse, onCountrySelect, onCountryHover])

  if (!worldData || countryLines.length === 0) {
    return null
  }

  return (
    <group>
      {countryLines.map(({ name, points }) => {
        if (points.length < 2) return null

        const isSelected = selectedCountry === name
        const isHovered = hoveredCountry === name
        const isUserCountry = userCountry === name
        const hasEvents = countriesWithEvents.includes(name)

        // Determine color based on state
        let color = '#ffffff' // Default: white
        let lineWidth = 1

        if (isSelected) {
          color = '#3B82F6' // Vibrant blue
          lineWidth = 3
        } else if (isHovered) {
          color = '#60A5FA' // Pale blue
          lineWidth = 2
        } else if (isUserCountry) {
          color = '#F59E0B' // Warm gold/amber
          lineWidth = 2
        } else if (hasEvents) {
          color = '#E5E7EB' // Light gray
          lineWidth = 1
        }

        // Create geometry from points for country outline
        const geometry = new THREE.BufferGeometry().setFromPoints(points)

        // Create a simple mesh for click detection
        const shape = new THREE.Shape()
        if (points.length > 0) {
          const firstPoint = points[0]
          shape.moveTo(firstPoint.x, firstPoint.y)
          points.slice(1).forEach((point) => {
            shape.lineTo(point.x, point.y)
          })
          shape.lineTo(firstPoint.x, firstPoint.y)
        }

        const meshGeometry = new THREE.ShapeGeometry(shape)
        const material = new THREE.LineBasicMaterial({
          color: color,
          linewidth: lineWidth,
          transparent: true,
          opacity: isSelected ? 1 : isHovered ? 0.8 : 0.6,
        })
        const line = new THREE.Line(geometry, material)

        return (
          <group key={name}>
            <primitive object={line} />
            {/* Invisible mesh for click detection */}
            <mesh
              geometry={meshGeometry}
              visible={false}
              ref={(ref) => {
                if (ref) {
                  countryMeshesRef.current.set(name, ref)
                }
              }}
            >
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}


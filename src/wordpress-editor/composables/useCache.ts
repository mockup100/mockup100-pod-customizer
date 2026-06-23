import { ref, reactive } from 'vue'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number
  persistToStorage?: boolean
  storageKey?: string
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl?: number
  hits: number
}

class Cache<T = any> {
  private data = new Map<string, CacheEntry<T>>()
  private maxSize: number
  private persistToStorage: boolean
  private storageKey: string

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100
    this.persistToStorage = options.persistToStorage || false
    this.storageKey = options.storageKey || 'app-cache'
    
    // Load from storage if enabled
    if (this.persistToStorage && typeof window !== 'undefined') {
      this.loadFromStorage()
    }
  }

  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || undefined,
      hits: 0
    }

    // Remove oldest entry if cache is full
    if (this.data.size >= this.maxSize) {
      const oldestKey = this.data.keys().next().value
      if (oldestKey) {
        this.data.delete(oldestKey)
      }
    }

    this.data.set(key, entry)
    this.saveToStorage()
  }

  get(key: string): T | null {
    const entry = this.data.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.data.delete(key)
      this.saveToStorage()
      return null
    }

    // Update hit count
    entry.hits++
    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    const deleted = this.data.delete(key)
    if (deleted) {
      this.saveToStorage()
    }
    return deleted
  }

  clear(): void {
    this.data.clear()
    this.saveToStorage()
  }

  size(): number {
    return this.data.size
  }

  keys(): string[] {
    return Array.from(this.data.keys())
  }

  values(): T[] {
    return Array.from(this.data.values()).map(entry => entry.value)
  }

  // Get cache statistics
  getStats() {
    const entries = Array.from(this.data.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0

    return {
      size: this.data.size,
      maxSize: this.maxSize,
      totalHits,
      avgHits: Math.round(avgHits * 100) / 100,
      hitRate: totalHits > 0 ? Math.round((totalHits / (totalHits + entries.length)) * 100) : 0
    }
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.data) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.data.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.saveToStorage()
    }

    return cleaned
  }

  private saveToStorage(): void {
    if (!this.persistToStorage || typeof window === 'undefined') return

    try {
      const serialized = JSON.stringify(Array.from(this.data.entries()))
      localStorage.setItem(this.storageKey, serialized)
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  private loadFromStorage(): void {
    if (!this.persistToStorage || typeof window === 'undefined') return

    try {
      const serialized = localStorage.getItem(this.storageKey)
      if (serialized) {
        const entries = JSON.parse(serialized)
        this.data = new Map(entries)
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }
}

// Global cache instances
const caches = new Map<string, Cache>()

export function useCache<T = any>(name: string, options?: CacheOptions) {
  // Return existing cache if it exists
  if (caches.has(name)) {
    return caches.get(name) as Cache<T>
  }

  // Create new cache
  const cache = new Cache<T>(options)
  caches.set(name, cache)
  return cache
}

// Composable for reactive caching
export function useReactiveCache<T = any>(name: string, options?: CacheOptions) {
  const cache = useCache<T>(name, options)
  const stats = reactive(cache.getStats())

  const set = (key: string, value: T, ttl?: number) => {
    cache.set(key, value, ttl)
    Object.assign(stats, cache.getStats())
  }

  const get = (key: string): T | null => {
    const value = cache.get(key)
    Object.assign(stats, cache.getStats())
    return value
  }

  const remove = (key: string): boolean => {
    const removed = cache.delete(key)
    Object.assign(stats, cache.getStats())
    return removed
  }

  const clear = () => {
    cache.clear()
    Object.assign(stats, cache.getStats())
  }

  const cleanup = () => {
    const cleaned = cache.cleanup()
    Object.assign(stats, cache.getStats())
    return cleaned
  }

  return {
    cache,
    stats,
    set,
    get,
    has: cache.has.bind(cache),
    remove,
    clear,
    cleanup,
    size: cache.size.bind(cache),
    keys: cache.keys.bind(cache),
    values: cache.values.bind(cache)
  }
}

// Utility functions for common caching patterns
export function useAsyncCache<T = any>(
  name: string,
  fetcher: (key: string) => Promise<T>,
  options?: CacheOptions & { defaultTtl?: number }
) {
  const cache = useReactiveCache<T>(name, options)
  const loading = ref(new Set<string>())
  const errors = ref(new Map<string, Error>())

  const getOrFetch = async (key: string, ttl?: number): Promise<T> => {
    // Try to get from cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    // Check if already loading
    if (loading.value.has(key)) {
      return new Promise((resolve, reject) => {
        const checkLoading = () => {
          if (!loading.value.has(key)) {
            const error = errors.value.get(key)
            if (error) {
              reject(error)
            } else {
              const result = cache.get(key)
              if (result !== null) {
                resolve(result)
              } else {
                reject(new Error('Failed to fetch data'))
              }
            }
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    // Mark as loading
    loading.value.add(key)
    errors.value.delete(key)

    try {
      const result = await fetcher(key)
      const cacheTtl = ttl || options?.defaultTtl || 300000 // 5 minutes default
      cache.set(key, result, cacheTtl)
      return result
    } catch (error) {
      errors.value.set(key, error as Error)
      throw error
    } finally {
      loading.value.delete(key)
    }
  }

  const prefetch = async (key: string, ttl?: number) => {
    try {
      await getOrFetch(key, ttl)
    } catch (error) {
      // Silent fail for prefetch
      console.warn('Prefetch failed for key:', key, error)
    }
  }

  const invalidate = (key: string) => {
    cache.remove(key)
    errors.value.delete(key)
  }

  const invalidateAll = () => {
    cache.clear()
    errors.value.clear()
    loading.value.clear()
  }

  return {
    ...cache,
    getOrFetch,
    prefetch,
    invalidate,
    invalidateAll,
    isLoading: (key: string) => loading.value.has(key),
    getError: (key: string) => errors.value.get(key),
    hasError: (key: string) => errors.value.has(key)
  }
}

// Global cache cleanup
export function setupCacheCleanup() {
  // Clean expired entries every 5 minutes
  setInterval(() => {
    let totalCleaned = 0
    for (const cache of caches.values()) {
      totalCleaned += cache.cleanup()
    }
    if (totalCleaned > 0) {
      console.log(`Cleaned ${totalCleaned} expired cache entries`)
    }
  }, 300000) // 5 minutes
}

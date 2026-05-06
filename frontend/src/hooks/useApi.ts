import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiClientError } from '@/lib/api'

interface UseApiOptions {
  enabled?: boolean
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(path: string | null, options: UseApiOptions = {}): UseApiResult<T> {
  const { enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled && path !== null)
  const [error, setError] = useState<string | null>(null)
  const counterRef = useRef(0)

  const fetchData = useCallback(async () => {
    if (!path || !enabled) return
    const id = ++counterRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<T>(path)
      if (id === counterRef.current) setData(result)
    } catch (err) {
      if (id === counterRef.current) {
        setError(err instanceof ApiClientError ? err.message : 'Fejl ved hentning af data')
      }
    } finally {
      if (id === counterRef.current) setLoading(false)
    }
  }, [path, enabled])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useMutation<TBody, TResult>(
  method: 'post' | 'patch' | 'put' | 'delete' = 'post',
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (path: string, body?: TBody): Promise<TResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await api[method]<TResult>(path, body)
        return result
      } catch (err) {
        const msg = err instanceof ApiClientError ? err.message : 'Handling fejlede'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [method],
  )

  return { mutate, loading, error }
}

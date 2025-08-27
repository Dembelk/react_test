import { useState, useCallback } from 'react'

interface UseCounterReturn {
  count: number
  increment: () => Promise<void>
  decrement: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const useCounter = (): UseCounterReturn => {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makeRequest = useCallback(async (endpoint: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`http://localhost:3001/api/counter/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setCount(data.value)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setError(errorMessage)
      console.error(`Error ${endpoint}ing counter:`, err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const increment = useCallback(() => makeRequest('increment'), [makeRequest])
  const decrement = useCallback(() => makeRequest('decrement'), [makeRequest])

  return {
    count,
    increment,
    decrement,
    isLoading,
    error,
  }
}

export default useCounter

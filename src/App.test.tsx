import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}))

// Mock fetch
global.fetch = jest.fn()

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ value: 1 }),
    })
  })

  test('renders main heading', () => {
    render(<App />)
    expect(screen.getByText('🚀 Новый MCP Проект')).toBeInTheDocument()
  })

  test('displays counter with initial value', () => {
    render(<App />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  test('increments counter when + button is clicked', async () => {
    render(<App />)
    
    const incrementButton = screen.getByText('+')
    fireEvent.click(incrementButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/counter/increment',
        { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    })
  })

  test('decrements counter when - button is clicked', async () => {
    render(<App />)
    
    const decrementButton = screen.getByText('-')
    fireEvent.click(decrementButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/counter/decrement',
        { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    })
  })

  test('shows achievements section', () => {
    render(<App />)
    expect(screen.getByText('🏆 Достижения')).toBeInTheDocument()
  })

  test('toggles achievements visibility', () => {
    render(<App />)
    
    const toggleButton = screen.getByLabelText(/Показать достижения/)
    fireEvent.click(toggleButton)
    
    expect(screen.getByLabelText(/Скрыть достижения/)).toBeInTheDocument()
  })

  test('displays features list', () => {
    render(<App />)
    expect(screen.getByText('Возможности проекта')).toBeInTheDocument()
    expect(screen.getByText('✅ React 18 с TypeScript')).toBeInTheDocument()
  })

  test('shows telegram bot information', () => {
    render(<App />)
    expect(screen.getByText('🤖 Telegram Bot')).toBeInTheDocument()
    expect(screen.getByText('/start')).toBeInTheDocument()
  })
})

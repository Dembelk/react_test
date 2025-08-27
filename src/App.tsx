import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import Counter from './components/Counter'
import Achievements from './components/Achievements'
import useCounter from './hooks/useCounter'
import './App.css'

interface Achievement {
  name: string
  description: string
  earned: boolean
}

interface Achievements {
  firstClick: Achievement
  tenClicks: Achievement
  hundredClicks: Achievement
  telegramUser: Achievement
  aiChatter: Achievement
}

function App() {
  const { count, increment, decrement, isLoading, error } = useCounter()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [achievements, setAchievements] = useState<Achievements>({
    firstClick: { name: "Первый клик", description: "Сделали первый клик", earned: false },
    tenClicks: { name: "Десятка", description: "Достигли 10 кликов", earned: false },
    hundredClicks: { name: "Сотня", description: "Достигли 100 кликов", earned: false },
    telegramUser: { name: "Телеграммер", description: "Использовали Telegram бота", earned: false },
    aiChatter: { name: "ИИ Чаттер", description: "Пообщались с ИИ", earned: false }
  })
  const [newAchievement, setNewAchievement] = useState<string | null>(null)

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)

    // Listen for counter updates
    newSocket.on('counterUpdate', (value: number) => {
      setCount(value)
    })

    // Listen for achievements updates
    newSocket.on('achievementsUpdate', (newAchievements: Achievements) => {
      setAchievements(newAchievements)
      
      // Check for new achievements
      Object.entries(newAchievements).forEach(([key, achievement]) => {
        if (achievement.earned && !achievements[key as keyof Achievements].earned) {
          setNewAchievement(achievement.name)
          setTimeout(() => setNewAchievement(null), 3000)
        }
      })
    })

    return () => {
      newSocket.close()
    }
  }, [])

  // Error handling display
  if (error) {
    console.error('Counter error:', error)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Новый MCP Проект</h1>
        <p>Добро пожаловать в современное React приложение с Telegram ботом и ИИ!</p>
      </header>
      
      <main className="app-main">
        {/* Error Display */}
        {error && (
          <div className="error-message">
            <p>Ошибка: {error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-indicator">
            <p>Загрузка...</p>
          </div>
        )}

        <Counter 
          count={count}
          onIncrement={increment}
          onDecrement={decrement}
        />

        <Achievements 
          achievements={achievements}
          newAchievement={newAchievement}
        />

        <div className="features">
          <h2>Возможности проекта</h2>
          <ul>
            <li>✅ React 18 с TypeScript</li>
            <li>✅ Vite для быстрой сборки</li>
            <li>✅ Telegram Bot интеграция</li>
            <li>✅ ИИ чат с OpenAI</li>
            <li>✅ Система достижений</li>
            <li>✅ Real-time обновления</li>
            <li>✅ Современный CSS</li>
          </ul>
        </div>

        <div className="telegram-info">
          <h2>🤖 Telegram Bot</h2>
          <p>Найдите нашего бота в Telegram и используйте команды:</p>
          <div className="bot-commands">
            <code>/start</code> - Начать работу с ботом<br/>
            <code>/counter</code> - Показать счетчик<br/>
            <code>/increment</code> - Увеличить счетчик<br/>
            <code>/decrement</code> - Уменьшить счетчик<br/>
            <code>/chat</code> - Чат с ИИ<br/>
            <code>/achievements</code> - Показать достижения
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Создано с ❤️ используя современные технологии</p>
      </footer>
    </div>
  )
}

export default App

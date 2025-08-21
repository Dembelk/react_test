import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import './App.css'

interface Achievement {
  name: string;
  description: string;
  earned: boolean;
}

interface Achievements {
  firstClick: Achievement;
  tenClicks: Achievement;
  hundredClicks: Achievement;
  telegramUser: Achievement;
  aiChatter: Achievement;
}

function App() {
  const [count, setCount] = useState(0)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [achievements, setAchievements] = useState<Achievements>({
    firstClick: { name: "Первый клик", description: "Сделали первый клик", earned: false },
    tenClicks: { name: "Десятка", description: "Достигли 10 кликов", earned: false },
    hundredClicks: { name: "Сотня", description: "Достигли 100 кликов", earned: false },
    telegramUser: { name: "Телеграммер", description: "Использовали Telegram бота", earned: false },
    aiChatter: { name: "ИИ Чаттер", description: "Пообщались с ИИ", earned: false }
  })
  const [showAchievements, setShowAchievements] = useState(false)
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

  const incrementCounter = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/counter/increment', {
        method: 'POST'
      })
      const data = await response.json()
      setCount(data.value)
    } catch (error) {
      console.error('Error incrementing counter:', error)
    }
  }

  const decrementCounter = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/counter/decrement', {
        method: 'POST'
      })
      const data = await response.json()
      setCount(data.value)
    } catch (error) {
      console.error('Error decrementing counter:', error)
    }
  }

  const earnedAchievementsCount = Object.values(achievements).filter(a => a.earned).length
  const totalAchievementsCount = Object.keys(achievements).length

  return (
    <div className="app">
      {/* New Achievement Notification */}
      {newAchievement && (
        <div className="achievement-notification">
          <div className="achievement-content">
            <span className="achievement-icon">🏆</span>
            <div className="achievement-text">
              <h3>Новое достижение!</h3>
              <p>{newAchievement}</p>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <h1>🚀 Новый MCP Проект</h1>
        <p>Добро пожаловать в современное React приложение с Telegram ботом и ИИ!</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <h2>Счетчик</h2>
          <div className="counter">
            <button 
              onClick={decrementCounter}
              className="counter-btn"
            >
              -
            </button>
            <span className="counter-value">{count}</span>
            <button 
              onClick={incrementCounter}
              className="counter-btn"
            >
              +
            </button>
          </div>
          <p className="counter-text">
            Нажмите кнопки для изменения значения
          </p>
        </div>

        {/* Achievements Section */}
        <div className="achievements-section">
          <div className="achievements-header">
            <h2>🏆 Достижения</h2>
            <button 
              className="toggle-btn"
              onClick={() => setShowAchievements(!showAchievements)}
            >
              {showAchievements ? 'Скрыть' : 'Показать'} ({earnedAchievementsCount}/{totalAchievementsCount})
            </button>
          </div>
          
          {showAchievements && (
            <div className="achievements-grid">
              {Object.entries(achievements).map(([key, achievement]) => (
                <div 
                  key={key} 
                  className={`achievement-card ${achievement.earned ? 'earned' : 'locked'}`}
                >
                  <div className="achievement-icon">
                    {achievement.earned ? '🏆' : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <h3>{achievement.name}</h3>
                    <p>{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

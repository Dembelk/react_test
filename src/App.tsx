import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Новый MCP Проект</h1>
        <p>Добро пожаловать в современное React приложение!</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <h2>Счетчик</h2>
          <div className="counter">
            <button 
              onClick={() => setCount(count - 1)}
              className="counter-btn"
            >
              -
            </button>
            <span className="counter-value">{count}</span>
            <button 
              onClick={() => setCount(count + 1)}
              className="counter-btn"
            >
              +
            </button>
          </div>
          <p className="counter-text">
            Нажмите кнопки для изменения значения
          </p>
        </div>

        <div className="features">
          <h2>Возможности проекта</h2>
          <ul>
            <li>✅ React 18 с TypeScript</li>
            <li>✅ Vite для быстрой сборки</li>
            <li>✅ Современный CSS</li>
            <li>✅ ESLint для качества кода</li>
            <li>✅ Готов к разработке</li>
          </ul>
        </div>
      </main>

      <footer className="app-footer">
        <p>Создано с ❤️ используя современные технологии</p>
      </footer>
    </div>
  )
}

export default App

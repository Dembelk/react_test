import React from 'react'

interface CounterProps {
  count: number
  onIncrement: () => void
  onDecrement: () => void
}

const Counter: React.FC<CounterProps> = ({ count, onIncrement, onDecrement }) => {
  return (
    <div className="card">
      <h2>Счетчик</h2>
      <div className="counter">
        <button 
          onClick={onDecrement}
          className="counter-btn"
          aria-label="Уменьшить счетчик"
        >
          -
        </button>
        <span className="counter-value">{count}</span>
        <button 
          onClick={onIncrement}
          className="counter-btn"
          aria-label="Увеличить счетчик"
        >
          +
        </button>
      </div>
      <p className="counter-text">
        Нажмите кнопки для изменения значения
      </p>
    </div>
  )
}

export default Counter

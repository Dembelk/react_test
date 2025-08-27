import React, { useState } from 'react'

interface Achievement {
  name: string
  description: string
  earned: boolean
}

interface AchievementsProps {
  achievements: Record<string, Achievement>
  newAchievement: string | null
}

const Achievements: React.FC<AchievementsProps> = ({ achievements, newAchievement }) => {
  const [showAchievements, setShowAchievements] = useState(false)
  
  const earnedAchievementsCount = Object.values(achievements).filter(a => a.earned).length
  const totalAchievementsCount = Object.keys(achievements).length

  return (
    <>
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

      {/* Achievements Section */}
      <div className="achievements-section">
        <div className="achievements-header">
          <h2>🏆 Достижения</h2>
          <button 
            className="toggle-btn"
            onClick={() => setShowAchievements(!showAchievements)}
            aria-label={`${showAchievements ? 'Скрыть' : 'Показать'} достижения`}
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
    </>
  )
}

export default Achievements

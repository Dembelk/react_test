const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Global state
let counterValue = 0;
let achievements = {
  firstClick: { name: "Первый клик", description: "Сделали первый клик", earned: false },
  tenClicks: { name: "Десятка", description: "Достигли 10 кликов", earned: false },
  hundredClicks: { name: "Сотня", description: "Достигли 100 кликов", earned: false },
  telegramUser: { name: "Телеграммер", description: "Использовали Telegram бота", earned: false },
  aiChatter: { name: "ИИ Чаттер", description: "Пообщались с ИИ", earned: false }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state to new client
  socket.emit('counterUpdate', counterValue);
  socket.emit('achievementsUpdate', achievements);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Counter API endpoints
app.get('/api/counter', (req, res) => {
  res.json({ value: counterValue });
});

app.post('/api/counter/increment', (req, res) => {
  counterValue++;
  checkAchievements();
  io.emit('counterUpdate', counterValue);
  io.emit('achievementsUpdate', achievements);
  res.json({ value: counterValue });
});

app.post('/api/counter/decrement', (req, res) => {
  counterValue--;
  checkAchievements();
  io.emit('counterUpdate', counterValue);
  io.emit('achievementsUpdate', achievements);
  res.json({ value: counterValue });
});

app.get('/api/achievements', (req, res) => {
  res.json(achievements);
});

// Achievement checking function
function checkAchievements() {
  if (counterValue === 1 && !achievements.firstClick.earned) {
    achievements.firstClick.earned = true;
    console.log('🏆 Достижение разблокировано: Первый клик');
  }
  
  if (counterValue >= 10 && !achievements.tenClicks.earned) {
    achievements.tenClicks.earned = true;
    console.log('🏆 Достижение разблокировано: Десятка');
  }
  
  if (counterValue >= 100 && !achievements.hundredClicks.earned) {
    achievements.hundredClicks.earned = true;
    console.log('🏆 Достижение разблокировано: Сотня');
  }
}

// Telegram Bot Commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🚀 Добро пожаловать в MCP Project Bot!

Доступные команды:
/counter - Показать текущее значение счетчика
/increment - Увеличить счетчик
/decrement - Уменьшить счетчик
/chat - Начать чат с ИИ
/achievements - Показать достижения
/help - Показать эту справку

Счетчик: ${counterValue}
  `;
  
  bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/counter/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `📊 Текущее значение счетчика: ${counterValue}`);
});

bot.onText(/\/increment/, (msg) => {
  const chatId = msg.chat.id;
  counterValue++;
  checkAchievements();
  io.emit('counterUpdate', counterValue);
  io.emit('achievementsUpdate', achievements);
  
  // Unlock Telegram user achievement
  if (!achievements.telegramUser.earned) {
    achievements.telegramUser.earned = true;
    io.emit('achievementsUpdate', achievements);
  }
  
  bot.sendMessage(chatId, `➕ Счетчик увеличен! Новое значение: ${counterValue}`);
});

bot.onText(/\/decrement/, (msg) => {
  const chatId = msg.chat.id;
  counterValue--;
  checkAchievements();
  io.emit('counterUpdate', counterValue);
  io.emit('achievementsUpdate', achievements);
  
  // Unlock Telegram user achievement
  if (!achievements.telegramUser.earned) {
    achievements.telegramUser.earned = true;
    io.emit('achievementsUpdate', achievements);
  }
  
  bot.sendMessage(chatId, `➖ Счетчик уменьшен! Новое значение: ${counterValue}`);
});

bot.onText(/\/achievements/, (msg) => {
  const chatId = msg.chat.id;
  let achievementsText = '🏆 Ваши достижения:\n\n';
  
  Object.entries(achievements).forEach(([key, achievement]) => {
    const status = achievement.earned ? '✅' : '❌';
    achievementsText += `${status} ${achievement.name}: ${achievement.description}\n`;
  });
  
  bot.sendMessage(chatId, achievementsText);
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🤖 Справка по командам:

/counter - Показать текущее значение счетчика
/increment - Увеличить счетчик
/decrement - Уменьшить счетчик
/chat - Начать чат с ИИ
/achievements - Показать достижения
/help - Показать эту справку

💡 Совет: Используйте /chat для общения с ИИ!
  `;
  
  bot.sendMessage(chatId, helpMessage);
});

// AI Chat functionality
bot.onText(/\/chat/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🤖 Привет! Я ИИ ассистент. Напишите мне что-нибудь, и я отвечу!');
});

// Handle AI chat messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Skip bot commands
  if (text.startsWith('/')) return;
  
  // Skip if it's not a chat message (like /chat command)
  if (text === '🤖 Привет! Я ИИ ассистент. Напишите мне что-нибудь, и я отвечу!') return;
  
  try {
    // Unlock AI chatter achievement
    if (!achievements.aiChatter.earned) {
      achievements.aiChatter.earned = true;
      io.emit('achievementsUpdate', achievements);
    }
    
    bot.sendMessage(chatId, '🤔 Думаю...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Ты дружелюбный ИИ ассистент. Отвечай кратко и по-русски. Ты помогаешь пользователю с проектом MCP."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 150
    });
    
    const aiResponse = completion.choices[0].message.content;
    bot.sendMessage(chatId, aiResponse);
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    bot.sendMessage(chatId, '😔 Извините, произошла ошибка при обработке вашего сообщения.');
  }
});

// Error handling
bot.on('error', (error) => {
  console.error('Telegram Bot Error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Telegram Bot Polling Error:', error);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Telegram Bot started`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`🌐 Frontend: http://localhost:3000`);
  console.log(`🔧 Backend API: http://localhost:${PORT}`);
});

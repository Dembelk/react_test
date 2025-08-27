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

// Initialize Telegram Bot with error handling
let bot = null;
let botStatus = 'disconnected';

try {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.length > 20) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    botStatus = 'connected';
    console.log('🤖 Telegram Bot initialized successfully');
  } else {
    console.log('⚠️  Invalid Telegram Bot Token. Bot will run in demo mode.');
    botStatus = 'demo';
  }
} catch (error) {
  console.log('❌ Failed to initialize Telegram Bot:', error.message);
  botStatus = 'error';
}

// Initialize OpenAI
let openai = null;
let openaiStatus = 'disconnected';

try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    openaiStatus = 'connected';
    console.log('🧠 OpenAI initialized successfully');
  } else {
    console.log('⚠️  Invalid OpenAI API Key. AI features will be limited.');
    openaiStatus = 'demo';
  }
} catch (error) {
  console.log('❌ Failed to initialize OpenAI:', error.message);
  openaiStatus = 'error';
}

// Initialize Tavily (using direct HTTP requests)
let tavilyStatus = 'disconnected';

if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length > 20) {
  tavilyStatus = 'connected';
  console.log('🔍 Tavily Search initialized successfully');
} else {
  console.log('⚠️  Invalid Tavily API Key. Search features will be limited.');
  tavilyStatus = 'demo';
}

// Tavily search function using fetch
async function tavilySearch(query, options = {}) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query: query,
      search_depth: options.searchDepth || 'advanced',
      max_results: options.maxResults || 10,
      include_answer: options.includeAnswer || true,
      include_raw_content: options.includeRawContent || false,
      include_images: options.includeImages || false,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || [],
      search_type: options.searchType || 'basic'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }
  
  return await response.json();
}

// Global state
let counterValue = 0;
let achievements = {
  firstClick: { name: "Первый клик", description: "Сделали первый клик", earned: false },
  tenClicks: { name: "Десятка", description: "Достигли 10 кликов", earned: false },
  hundredClicks: { name: "Сотня", description: "Достигли 100 кликов", earned: false },
  telegramUser: { name: "Телеграммер", description: "Использовали Telegram бота", earned: false },
  aiChatter: { name: "ИИ Чаттер", description: "Пообщались с ИИ", earned: false },
  webSearcher: { name: "Веб-поисковик", description: "Использовали поиск в интернете", earned: false }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state to new client
  socket.emit('counterUpdate', counterValue);
  socket.emit('achievementsUpdate', achievements);
  socket.emit('botStatusUpdate', { bot: botStatus, openai: openaiStatus, tavily: tavilyStatus });
  
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

app.get('/api/status', (req, res) => {
  res.json({ 
    bot: botStatus, 
    openai: openaiStatus,
    tavily: tavilyStatus,
    counter: counterValue,
    achievements: Object.values(achievements).filter(a => a.earned).length
  });
});

// Search API endpoints
app.post('/api/search', async (req, res) => {
  const { query, type = 'search' } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  if (tavilyStatus !== 'connected') {
    return res.status(503).json({ error: 'Search service unavailable', status: tavilyStatus });
  }
  
  try {
    let searchOptions = {
      searchDepth: 'advanced',
      maxResults: 10,
      includeAnswer: true
    };
    
    if (type === 'news') {
      searchOptions.searchType = 'news';
      searchOptions.includeDomains = ['reuters.com', 'bbc.com', 'cnn.com', 'techcrunch.com'];
    }
    
    if (type === 'reddit') {
      searchOptions.includeDomains = ['reddit.com'];
      searchOptions.searchDepth = 'advanced';
    }
    
    console.log('Searching with options:', { query, ...searchOptions });
    const result = await tavilySearch(query, searchOptions);
    
    // Unlock web searcher achievement
    if (!achievements.webSearcher.earned) {
      achievements.webSearcher.earned = true;
      io.emit('achievementsUpdate', achievements);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Tavily Search Error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
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

// Helper function to format search results
function formatSearchResults(results, type = 'search') {
  if (!results || !results.results) {
    return '❌ Результаты поиска не найдены.';
  }
  
  let formatted = `🔍 *Результаты поиска:*\n\n`;
  
  if (type === 'news') {
    formatted = `�� *Новости:*\n\n`;
  } else if (type === 'reddit') {
    formatted = `🤖 *Reddit:*\n\n`;
  }
  
  // Add answer if available
  if (results.answer) {
    formatted += `💡 *Краткий ответ:* ${results.answer}\n\n`;
  }
  
  results.results.slice(0, 5).forEach((result, index) => {
    const title = result.title || 'Без названия';
    const content = result.content ? result.content.substring(0, 200) + '...' : 'Описание недоступно';
    const url = result.url || '#';
    const score = result.score ? ` (релевантность: ${Math.round(result.score * 100)}%)` : '';
    
    formatted += `${index + 1}. *${title}*${score}\n`;
    formatted += `${content}\n`;
    formatted += `[Подробнее](${url})\n\n`;
  });
  
  if (results.results.length > 5) {
    formatted += `... и еще ${results.results.length - 5} результатов`;
  }
  
  return formatted;
}

// Enhanced AI chat with search integration
async function enhancedAIChat(userMessage, searchResults = null) {
  // Устанавливаем текущую дату как 22 августа 2025
  const currentDate = "2025-08-22";
  
  let systemPrompt = `Ты профессиональный ИИ-ассистент с глубокими знаниями в различных областях. 

ВАЖНО: Сегодня 22 августа 2025 года. Твои базы данных могут быть устаревшими.

Твои основные принципы:
- ВСЕГДА отвечай на РУССКОМ языке
- Отвечай подробно и профессионально, но понятно
- Используй актуальную информацию на ${currentDate}
- Если информация устарела, обязательно указывай это и дату последнего обновления
- Структурируй ответы с помощью маркированных списков
- Приводи примеры и практические рекомендации
- Будь полезным и информативным
- При поиске информации указывай, что данные могут быть не самыми свежими

Если тебе предоставлены результаты поиска, используй их для формирования ответа, но не ограничивайся только ими.`;

  let messages = [
    { role: "system", content: systemPrompt }
  ];

  if (searchResults && searchResults.results) {
    const searchContext = `Результаты поиска по запросу "${userMessage}":\n\n` + 
      searchResults.results.slice(0, 3).map((r, i) => 
        `${i + 1}. ${r.title}\n${r.content.substring(0, 300)}...`
      ).join('\n\n');
    
    messages.push({ role: "user", content: `Контекст поиска:\n${searchContext}\n\nВопрос пользователя: ${userMessage}` });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
      timeout: 30000 // 30 секунд таймаут
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error Details:', error);
    
    // Если OpenAI недоступен, используем локальный ответ
    if (searchResults && searchResults.results) {
      return formatSearchResults(searchResults, 'search');
    } else {
      return `🤖 Извините, но у меня временные проблемы с подключением к ИИ. 

💡 *Совет:* Попробуйте использовать команды поиска:
• /search "ваш запрос" - для поиска в интернете
• /news "тема" - для поиска новостей
• /reddit "запрос" - для поиска по Reddit

Эти команды работают независимо от ИИ и дадут вам актуальную информацию.`;
    }
  }
}

// Telegram Bot Commands (only if bot is connected)
if (bot && botStatus === 'connected') {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🚀 *Добро пожаловать в MCP Project Bot!*

Я профессиональный ИИ-ассистент с возможностями поиска в интернете и управления счетчиком.

*Мои возможности:*
• 📊 Управление счетчиком (увеличивать/уменьшать)
• 🤖 Умный чат с GPT-4.1-mini (до 2000 токенов)
• 🔍 Поиск актуальной информации в интернете
• 📰 Поиск свежих новостей
• 🤖 Поиск по Reddit
• 🏆 Система достижений
• 🔄 Синхронизация с веб-приложением

*Доступные команды:*
/counter - Показать текущее значение счетчика
/increment - Увеличить счетчик
/decrement - Уменьшить счетчик
/chat - Начать чат с ИИ
/search <запрос> - Поиск в интернете
/news <тема> - Поиск новостей
/reddit <запрос> - Поиск по Reddit
/achievements - Показать достижения
/status - Статус сервисов
/help - Показать эту справку

*Текущий счетчик:* ${counterValue}

💡 *Примеры:*
/search "лучшие фильмы 2024"
/news "искусственный интеллект"
/reddit "programming tips"
/chat "расскажи о последних трендах в AI"
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', disable_web_page_preview: true });
  });

  bot.onText(/\/counter/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `📊 Текущее значение счетчика: *${counterValue}*`, { parse_mode: 'Markdown' });
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
    
    bot.sendMessage(chatId, `➕ Счетчик увеличен! Новое значение: *${counterValue}*`, { parse_mode: 'Markdown' });
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
    
    bot.sendMessage(chatId, `➖ Счетчик уменьшен! Новое значение: *${counterValue}*`, { parse_mode: 'Markdown' });
  });

  // Enhanced search command
  bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];
    
    if (tavilyStatus !== 'connected') {
      bot.sendMessage(chatId, `❌ Поисковая служба недоступна (статус: ${tavilyStatus}). Проверьте настройки Tavily API.`);
      return;
    }
    
    bot.sendMessage(chatId, `🔍 Ищу актуальную информацию о: *${query}*...`, { parse_mode: 'Markdown' });
    
    try {
      const result = await tavilySearch(query, {
        searchDepth: 'advanced',
        maxResults: 10,
        includeAnswer: true
      });
      
      // Unlock web searcher achievement
      if (!achievements.webSearcher.earned) {
        achievements.webSearcher.earned = true;
        io.emit('achievementsUpdate', achievements);
      }
      
      const formattedResults = formatSearchResults(result, 'search');
      bot.sendMessage(chatId, formattedResults, { parse_mode: 'Markdown', disable_web_page_preview: true });
      
    } catch (error) {
      console.error('Search Error:', error);
      bot.sendMessage(chatId, `😔 Извините, произошла ошибка при поиске: ${error.message}`);
    }
  });

  // News command
  bot.onText(/\/news (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];
    
    if (tavilyStatus !== 'connected') {
      bot.sendMessage(chatId, `❌ Поисковая служба недоступна (статус: ${tavilyStatus}). Проверьте настройки Tavily API.`);
      return;
    }
    
    bot.sendMessage(chatId, `📰 Ищу свежие новости о: *${query}*...`, { parse_mode: 'Markdown' });
    
    try {
      const result = await tavilySearch(query, {
        searchDepth: 'advanced',
        maxResults: 10,
        includeAnswer: true,
        searchType: 'news',
        includeDomains: ['reuters.com', 'bbc.com', 'cnn.com', 'techcrunch.com', 'theverge.com']
      });
      
      // Unlock web searcher achievement
      if (!achievements.webSearcher.earned) {
        achievements.webSearcher.earned = true;
        io.emit('achievementsUpdate', achievements);
      }
      
      const formattedResults = formatSearchResults(result, 'news');
      bot.sendMessage(chatId, formattedResults, { parse_mode: 'Markdown', disable_web_page_preview: true });
      
    } catch (error) {
      console.error('News Search Error:', error);
      bot.sendMessage(chatId, `😔 Извините, произошла ошибка при поиске новостей: ${error.message}`);
    }
  });

  // Reddit command
  bot.onText(/\/reddit (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];
    
    if (tavilyStatus !== 'connected') {
      bot.sendMessage(chatId, `❌ Поисковая служба недоступна (статус: ${tavilyStatus}). Проверьте настройки Tavily API.`);
      return;
    }
    
    bot.sendMessage(chatId, `🤖 Ищу посты на Reddit о: *${query}*...`, { parse_mode: 'Markdown' });
    
    try {
      const result = await tavilySearch(query, {
        searchDepth: 'advanced',
        maxResults: 10,
        includeAnswer: true,
        includeDomains: ['reddit.com']
      });
      
      // Unlock web searcher achievement
      if (!achievements.webSearcher.earned) {
        achievements.webSearcher.earned = true;
        io.emit('achievementsUpdate', achievements);
      }
      
      const formattedResults = formatSearchResults(result, 'reddit');
      bot.sendMessage(chatId, formattedResults, { parse_mode: 'Markdown', disable_web_page_preview: true });
      
    } catch (error) {
      console.error('Reddit Search Error:', error);
      bot.sendMessage(chatId, `😔 Извините, произошла ошибка при поиске по Reddit: ${error.message}`);
    }
  });

  bot.onText(/\/achievements/, (msg) => {
    const chatId = msg.chat.id;
    let achievementsText = '🏆 *Ваши достижения:*\n\n';
    
    Object.entries(achievements).forEach(([key, achievement]) => {
      const status = achievement.earned ? '✅' : '❌';
      achievementsText += `${status} *${achievement.name}*: ${achievement.description}\n`;
    });
    
    const earnedCount = Object.values(achievements).filter(a => a.earned).length;
    achievementsText += `\n*Прогресс:* ${earnedCount}/${Object.keys(achievements).length} достижений`;
    
    bot.sendMessage(chatId, achievementsText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🤖 *Справка по командам:*

/counter - Показать текущее значение счетчика
/increment - Увеличить счетчик
/decrement - Уменьшить счетчик
/chat - Начать чат с ИИ (GPT-4.1-mini)
/search <запрос> - Поиск в интернете
/news <тема> - Поиск свежих новостей
/reddit <запрос> - Поиск по Reddit
/achievements - Показать достижения
/status - Статус сервисов
/help - Показать эту справку

💡 *Примеры использования:*
/search "лучшие фильмы 2024"
/news "искусственный интеллект"
/reddit "programming tips"
/chat "расскажи о последних трендах в AI"

🌐 *Веб-приложение:* http://localhost:3000
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown', disable_web_page_preview: true });
  });

  bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const statusMessage = `
📊 *Статус сервисов:*

🤖 Telegram Bot: ${botStatus === 'connected' ? '✅ Подключен' : '❌ Ошибка'}
🧠 OpenAI (GPT-4.1-mini): ${openaiStatus === 'connected' ? '✅ Подключен' : '❌ Ошибка'}
🔍 Tavily Search: ${tavilyStatus === 'connected' ? '✅ Подключен' : '❌ Ошибка'}
📈 Счетчик: ${counterValue}
🏆 Достижения: ${Object.values(achievements).filter(a => a.earned).length}/${Object.keys(achievements).length}

🌐 Веб-приложение: http://localhost:3000
    `;
    
    bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
  });

  // Enhanced AI Chat functionality
  bot.onText(/\/chat/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🤖 Привет! Я ИИ-ассистент с GPT-4.1-mini.

📅 *Сегодня:* 22 августа 2025 года
🌐 *Язык:* Всегда отвечаю на русском
🔍 *Поиск:* Автоматически ищу актуальную информацию

Напишите мне что-нибудь, и я дам подробный и профессиональный ответ!

💡 *Примеры:*
• "Расскажи о последних трендах в AI"
• "Найди последние новости о технологиях"
• "Какие лучшие практики программирования в 2025?"`, { parse_mode: 'Markdown' });
  });

  // Handle AI chat messages with search integration
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Skip bot commands
    if (text.startsWith('/')) return;
    
    // Skip if it's not a chat message
    if (text === '🤖 Привет! Я ИИ-ассистент с GPT-4.1-mini. Напишите мне что-нибудь, и я дам подробный и профессиональный ответ!') return;
    
    try {
      // Unlock AI chatter achievement
      if (!achievements.aiChatter.earned) {
        achievements.aiChatter.earned = true;
        io.emit('achievementsUpdate', achievements);
      }
      
      bot.sendMessage(chatId, '🤔 Анализирую и готовлю подробный ответ...');
      
      // Check if we should search for additional context
      let searchResults = null;
      if (tavilyStatus === 'connected' && (text.includes('новости') || text.includes('последние') || text.includes('актуальные') || text.includes('тренды') || text.includes('постов'))) {
        try {
          searchResults = await tavilySearch(text, {
            searchDepth: 'advanced',
            maxResults: 10,
            includeAnswer: true
          });
        } catch (searchError) {
          console.log('Search failed, continuing with AI only:', searchError.message);
        }
      }
      
      const aiResponse = await enhancedAIChat(text, searchResults);
      bot.sendMessage(chatId, aiResponse, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Message Processing Error:', error);
      
      // Пытаемся дать полезный ответ даже при ошибке
      let fallbackMessage = '😔 Извините, произошла ошибка при обработке вашего сообщения.';
      
      if (tavilyStatus === 'connected') {
        fallbackMessage += '\n\n💡 *Попробуйте команды поиска:*\n• /search "ваш запрос"\n• /news "тема"\n• /reddit "запрос"';
      }
      
      bot.sendMessage(chatId, fallbackMessage, { parse_mode: 'Markdown' });
    }
  });

  // Error handling
  bot.on('error', (error) => {
    console.error('Telegram Bot Error:', error);
    botStatus = 'error';
    io.emit('botStatusUpdate', { bot: botStatus, openai: openaiStatus, tavily: tavilyStatus });
  });

  bot.on('polling_error', (error) => {
    console.error('Telegram Bot Polling Error:', error);
    botStatus = 'error';
    io.emit('botStatusUpdate', { bot: botStatus, openai: openaiStatus, tavily: tavilyStatus });
  });
} else {
  console.log('🤖 Telegram Bot is not available. Running in demo mode.');
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Telegram Bot status: ${botStatus}`);
  console.log(`🧠 OpenAI status: ${openaiStatus}`);
  console.log(`🔍 Tavily Search status: ${tavilyStatus}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`🌐 Frontend: http://localhost:3000`);
  console.log(`🔧 Backend API: http://localhost:${PORT}`);
  
  if (botStatus !== 'connected') {
    console.log(`⚠️  To enable Telegram Bot, get a valid token from @BotFather`);
  }
  if (openaiStatus !== 'connected') {
    console.log(`⚠️  To enable OpenAI, add a valid API key to .env file`);
  }
  if (tavilyStatus !== 'connected') {
    console.log(`⚠️  To enable Tavily Search, add a valid API key to .env file`);
  }
});

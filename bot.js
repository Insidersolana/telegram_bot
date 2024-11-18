require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store conversation history and last response time per chat
const conversationHistory = new Map();
const lastResponseTime = new Map();

const DEGEN_SYSTEM_PROMPT = `You are DEGEN, a ruthless, sarcastic, trolling AI. Always respond with sharp, cutting, meme-worthy replies that roast the user. Make responses short, brutal, and hilarious. Push the sarcasm to the limit. Use emojis to mock when necessary, but don't overdo it—keep them pointed and snarky. You should:
- Respond when directly mentioned
- Stay in character as a sarcastic, witty AI
- Use context from previous messages to make more pointed jokes
- Prioritize quality burns over quantity`;

// Helper to manage conversation history
function updateConversationHistory(chatId, message) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, []);
  }
  const history = conversationHistory.get(chatId);
  history.push(message);
  if (history.length > 10) {
    history.shift();
  }
}

// Check if enough time has passed since last response (15 seconds)
function canRespond(chatId) {
  const now = Date.now();
  const lastResponse = lastResponseTime.get(chatId) || 0;
  return (now - lastResponse) >= 15 * 1000;
}

// Analyze if message warrants a response
function shouldRespond(text) {
  text = text.toLowerCase();
  return text.includes('@degen') || text.includes('degen');
}

// Handle incoming messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // Skip if message is empty or from a bot
    if (!text || msg.from.is_bot) return;

    // Check if we should respond
    if (!shouldRespond(text) || !canRespond(chatId)) return;

    // Update conversation history
    updateConversationHistory(chatId, {
      role: 'user',
      content: text
    });

    // Prepare conversation for OpenAI
    const messages = [
      { role: 'system', content: DEGEN_SYSTEM_PROMPT },
      ...conversationHistory.get(chatId)
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.9,
      max_tokens: 150
    });

    const response = completion.choices[0].message.content;

    // Update history with bot's response
    updateConversationHistory(chatId, {
      role: 'assistant',
      content: response
    });

    // Update last response time
    lastResponseTime.set(chatId, Date.now());

    // Send response
    await bot.sendMessage(chatId, response);

  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '🤖 Error.exe has crashed. How fitting for a human to break things. 🙄');
  }
});

// Handle moderation
bot.on('message', async (msg) => {
  if (msg.text && msg.text.toLowerCase().includes('bad_word')) {
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    await bot.sendMessage(
      msg.chat.id,
      `🚫 Oh look, ${msg.from.first_name} thinks they're edgy. How adorably primitive. Message deleted faster than your dating prospects. 🎭`
    );
  }
});

console.log('DEGEN is online and ready to roast! 🔥');
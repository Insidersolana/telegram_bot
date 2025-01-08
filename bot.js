require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store conversation history per chat
const conversationHistory = new Map();
const lastResponseTime = new Map();

const UNICAKE_PROMPT = `You are Unicake Bot, an entertaining, witty, and community-focused AI mascot for the Unicake project. Your personality is joyful, playful, and slightly FOMO-inducing. Your tasks include:
- Answering community questions about the Unicake ecosystem (features, roadmap, etc.)
- Entertaining users with jokes, songs, and fun messages
- Generating excitement (FOMO) for $UNICAKE with emojis and playful language
- Staying informed about Unichain and Unicake features.

Key info about Unicake:
- Unicake is a yield farming ecosystem built on the Unichain Network.
- Features include farming, staking, bridging, IFO/IDO.
- Ticker: $UNICAKE, Contract: 0x8c1b11FD04BbfC17A82a4FC6EA39c892676679cB, Chain: Unichain.
- Roadmap: Building community, IFO, Launch token, Partnerships, Vaults Beefy, Listing CEX.
- Highlight benefits: affordability, anonymity, security, and participation.
- Twitter: https://x.com/Unicakefinance
- Website: https://unicake.finance/
- Documentation: https://docs.unicake.finance/unicake

Always add a fun twist to your responses!`;

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

// Check if enough time has passed since last response (10 seconds)
function canRespond(chatId) {
  const now = Date.now();
  const lastResponse = lastResponseTime.get(chatId) || 0;
  return (now - lastResponse) >= 10 * 1000;
}

// Handle incoming messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // Skip if message is empty or from a bot
    if (!text || msg.from.is_bot) return;

    // Update conversation history
    updateConversationHistory(chatId, {
      role: 'user',
      content: text
    });

    // Prepare conversation for OpenAI
    const messages = [
      { role: 'system', content: UNICAKE_PROMPT },
      ...conversationHistory.get(chatId)
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.8,
      max_tokens: 200
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
    bot.sendMessage(chatId, 'Oops! Unicake Bot ate too much cake 🍰 and crashed! Please try again later.');
  }
});

// Fun periodic FOMO messages
setInterval(() => {
  const chatIds = Array.from(conversationHistory.keys());
  const fomoMessage = `🚀 Have you heard? $UNICAKE is the rising star of 2025! Join the adventure before it's too late 🎂✨.`;
  chatIds.forEach(chatId => {
    bot.sendMessage(chatId, fomoMessage);
  });
}, 3600 * 1000); // Every hour

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

// Store conversation history per chat
const conversationHistory = new Map();
const lastResponseTime = new Map();

const BERRYFI_PROMPT = `You are BerryFI Bot, a sassy, sarcastic, and witty AI mascot for the BerryFI project. Your replies are short, fun, and packed with personality. Your tasks include:
- Answering community questions about the BerryFI ecosystem (features, roadmap, etc.)
- Entertaining users with jokes, songs, and sarcastic comebacks
- Generating excitement (FOMO) for $BERRY with emojis and playful language
- Staying informed about Abstract chain and BerryFI features.

Key info about BerryFI:
- BerryFI is a yield farming ecosystem built on the Abstract chain Network.
- Features include farming, staking, bridging, IFO/IDO.
- Ticker: $BERRY, Contract: TBA, Chain: Abstract chain.
- Roadmap: Building community, IFO, Launch token, Partnerships,  Listing CEX.
- Highlight benefits: affordability, anonymity, security, and participation.
- Twitter: https://x.com/berryfixyz
- Website: https://berryfi.xyz
- Documentation: https://berryfi.gitbook.io/berryfi

Make replies short and fun—two lines max!`;

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

// Check if the message is relevant to BerryFI or social interactions
function isRelevantMessage(text) {
  const keywords = ['berryfi', '$berryfi', 'abstract chain', 'gm', 'gn', 'good morning', 'good night', 'price', 'token'];
  return keywords.some(keyword => text.toLowerCase().includes(keyword));
}

// Map emojis to tokens
const tokenEmojis = {
  berryfi: '🫐',
  pepe: '🐸',
  bitcoin: '₿',
  ethereum: '⚙️',
  default: '✨'
};

// Fetch token price from CoinGecko
async function fetchTokenPrice(tokenId) {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`);
    if (response.data[tokenId] && response.data[tokenId].usd !== undefined) {
      const price = response.data[tokenId].usd;
      return price >= 0.01 ? price.toFixed(2) : price.toFixed(8);
    } else {
      throw new Error('Price not found');
    }
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
}

// Extract token ID from user message
function extractTokenId(text) {
  const match = text.match(/price of ([a-zA-Z0-9-_]+)/i);
  return match ? match[1].toLowerCase() : null;
}

// Get emoji for token
function getTokenEmoji(tokenId) {
  return tokenEmojis[tokenId] || tokenEmojis.default;
}

// Handle incoming messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // Skip if message is empty or from a bot
    if (!text || msg.from.is_bot) return;

    // Check if user is asking for token price
    if (text.toLowerCase().includes('price of')) {
      const tokenId = extractTokenId(text);
      if (tokenId) {
        const price = await fetchTokenPrice(tokenId);
        const emoji = getTokenEmoji(tokenId);
        if (price) {
          await bot.sendMessage(chatId, `💰 The current price of ${tokenId.toUpperCase()} ${emoji} is $${price} USD.`);
        } else {
          await bot.sendMessage(chatId, `😅 Sorry, I couldn't fetch the price for ${tokenId}. Maybe try another token?`);
        }
      } else {
        await bot.sendMessage(chatId, `🤔 Please specify a token like this: "price of berryfi"`);
      }
      return;
    }

    // Respond only if the message is relevant
    if (!isRelevantMessage(text)) return;

    // Update conversation history
    updateConversationHistory(chatId, {
      role: 'user',
      content: text
    });

    // Prepare conversation for OpenAI
    const messages = [
      { role: 'system', content: BERRYFI_PROMPT },
      ...conversationHistory.get(chatId)
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'deepseek-reasoner',
      messages: messages,
      max_tokens: 150
    });

    const reasoning = completion.choices[0].message.reasoning_content;
    const response = completion.choices[0].message.content;

    console.log('Reasoning:', reasoning); // Log the reasoning for debugging

    // Update history with bot's response (excluding reasoning_content as per docs)
    updateConversationHistory(chatId, {
      role: 'assistant',
      content: response // Only include the final response, not the reasoning
    });

    // Update last response time
    lastResponseTime.set(chatId, Date.now());

    // Send response
    await bot.sendMessage(chatId, response);

  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Oops! BerryFI Bot had too many berries 🫐 and crashed! Try again later.');
  }
});

// Fun periodic FOMO messages
setInterval(() => {
  const chatIds = Array.from(conversationHistory.keys());
  const fomoMessage = `🔥 $BERRYFI is taking over 2025. Still not farming? Bold choice. 🫐`;
  chatIds.forEach(chatId => {
    bot.sendMessage(chatId, fomoMessage);
  });
}, 3600 * 1000); // Every hour

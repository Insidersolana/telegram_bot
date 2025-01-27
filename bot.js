require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const axios = require('axios');

// Function to format numbers for better readability
function formatNumber(num) {
  if (!num) return '$0';
  num = Number(num);
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const BERRYFI_TOP_CHANNEL = '@berryFiTOP';

// Function to get relative time
function getRelativeTime(dateString) {
  const created = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

// Function to analyze and post top pools
async function postTopPools() {
  try {
    const response = await axios.get('https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=1');
    if (!response.data?.data) return;

    // Sort pools by 5min volume
    const pools = response.data.data
      .sort((a, b) => Number(b.attributes.volume_usd.m5) - Number(a.attributes.volume_usd.m5))
      .slice(0, 5);

    let message = '🏆 TOP 5 POOLS BY 5MIN VOLUME\n\n';

    pools.forEach((pool, index) => {
      const attr = pool.attributes;
      const rank = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      const priceChange5m = Number(attr.price_change_percentage.m5).toFixed(2);
      const priceEmoji = priceChange5m >= 0 ? '📈' : '📉';
      const trades5m = attr.transactions.m5;
      const buyRatio = ((trades5m.buys / (trades5m.buys + trades5m.sells)) * 100).toFixed(0);

      message += `${rank} ${attr.name}
💰 $${Number(attr.base_token_price_usd).toFixed(6)} ${priceEmoji} ${priceChange5m}% (5m)
📊 5m Vol: ${formatNumber(attr.volume_usd.m5)}
👥 Buys: ${trades5m.buys} (${buyRatio}%) | Sells: ${trades5m.sells}
[Chart](https://www.geckoterminal.com/abstract/pools/${attr.address})\n\n`;
    });

    message += '🔄 Updates every 5 minutes';

    await bot.sendMessage(BERRYFI_TOP_CHANNEL, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error posting top pools:', error);
  }
}

// Start the top pools update interval
setInterval(postTopPools, 5 * 60 * 1000); // Every 5 minutes
postTopPools(); // Initial post
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

// Fetch token information from abscan
async function fetchTokenInfo(contractAddress) {
  try {
    // Fetch token supply
    const supplyResponse = await axios.get(`https://api.abscan.org/api`, {
      params: {
        module: 'stats',
        action: 'tokensupply',
        contractaddress: contractAddress,
        apikey: process.env.ABSCAN_API_KEY
      }
    });

    // Fetch contract verification status
    const verificationResponse = await axios.get(`https://api.abscan.org/api`, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: contractAddress,
        apikey: process.env.ABSCAN_API_KEY
      }
    });

    const info = {
      totalSupply: null,
      isVerified: false,
      verificationMessage: '',
      holdersCount: '0'
    };

    // Parse supply response
    if (supplyResponse.data.status === '1' && supplyResponse.data.message === 'OK') {
      info.totalSupply = supplyResponse.data.result;
    }

    // Parse verification response
    if (verificationResponse.data.status === '1') {
      info.isVerified = true;
      info.verificationMessage = 'Contract source code verified';
    } else {
      info.verificationMessage = verificationResponse.data.result || 'Contract source code not verified';
    }

    // Only proceed if we got valid supply (means it's a valid token)
    if (info.totalSupply) {
      // Try to fetch holders count
      try {
        const holdersResponse = await axios.get(`https://api.abscan.org/api`, {
          params: {
            module: 'token',
            action: 'getTokenHolders',
            contractaddress: contractAddress,
            apikey: process.env.ABSCAN_API_KEY
          }
        });
        
        if (holdersResponse.data.status === '1' && holdersResponse.data.message === 'OK') {
          info.holdersCount = holdersResponse.data.result;
        }
      } catch (error) {
        console.error('Error fetching holders count:', error);
      }

      return info;
    }

    return null;
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}

// Check if text is a scan request with contract address
function isScanRequest(text) {
  return text.toLowerCase().includes('scan') && /0x[a-fA-F0-9]{40}/.test(text);
}

// Extract contract address from text
function extractContractAddress(text) {
  const match = text.match(/0x[a-fA-F0-9]{40}/);
  return match ? match[0] : null;
}

// Fetch token and pool information from GeckoTerminal
async function fetchGeckoTerminalInfo(contractAddress) {
  try {
    // First get token info
    const tokenResponse = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/abstract/tokens/${contractAddress}`
    );
    
    if (!tokenResponse.data?.data?.relationships?.top_pools?.data?.[0]?.id) {
      return null;
    }

    const tokenAttributes = tokenResponse.data.data.attributes;
    const poolId = tokenResponse.data.data.relationships.top_pools.data[0].id.split('_')[1];

    // Then get pool info
    const poolResponse = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/abstract/pools/${poolId}`
    );

    if (!poolResponse.data?.data?.attributes) {
      return null;
    }

    const poolAttributes = poolResponse.data.data.attributes;
    const transactions = poolAttributes.transactions;
    const volume = poolAttributes.volume_usd;

    // Format supply with 18 decimals (US format)
    const formattedSupply = tokenAttributes.total_supply 
      ? (Number(tokenAttributes.total_supply) / Math.pow(10, 18)).toLocaleString('en-US')
      : '0';

    // Calculate market cap (price * supply)
    const marketCap = Number(tokenAttributes.price_usd) * (Number(tokenAttributes.total_supply) / Math.pow(10, 18));

    return {
      name: tokenAttributes.name || 'Unknown',
      symbol: tokenAttributes.symbol || 'Unknown',
      price_usd: tokenAttributes.price_usd || '0',
      market_cap_usd: marketCap.toString(),
      total_supply: formattedSupply,
      pool_address: poolId,
      pool_name: poolAttributes.name,
      pool_created_at: (() => {
        const createdAt = new Date(poolAttributes.pool_created_at);
        const now = new Date();
        const diffHours = Math.floor((now - createdAt) / (1000 * 60 * 60));
        
        if (diffHours < 24) {
          return `${diffHours} hours ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays} days ago`;
        }
      })(),
      liquidity_usd: poolAttributes.reserve_in_usd,
      h24_volume: volume.h24,
      h1_volume: volume.h1,
      price_change: {
        h1: poolAttributes.price_change_percentage.h1,
        h24: poolAttributes.price_change_percentage.h24
      },
      trading_metrics: {
        h24_buys: transactions.h24.buys,
        h24_sells: transactions.h24.sells,
        m5: transactions.m5,
        h1: transactions.h1
      }
    };
  } catch (error) {
    console.error('Error fetching GeckoTerminal info:', error);
    return null;
  }
}

// Modify the main message handler to include contract address detection
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // Skip if message is empty or from a bot
    if (!text || msg.from.is_bot) return;

    // Check if the message is a scan request
    if (isScanRequest(text)) {
      const contractAddress = extractContractAddress(text);
      if (!contractAddress) return;

      // Immediately reply to the message with scanning status
      await bot.sendMessage(chatId, '🔍 Scanning token...', {
        reply_to_message_id: msg.message_id
      });

      const tokenInfo = await fetchGeckoTerminalInfo(contractAddress);
      
      if (tokenInfo) {
        // Format numbers for better readability
        const formatNumber = (num) => {
          if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
          if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
          if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
          return `$${Number(num).toFixed(2)}`;
        };

        await bot.sendMessage(chatId, `📊 ${tokenInfo.name} (${tokenInfo.symbol})

💰 Price: $${Number(tokenInfo.price_usd).toFixed(6)}
📈 1h: ${tokenInfo.price_change.h1}% | 24h: ${tokenInfo.price_change.h24}%
💎 Market Cap: ${formatNumber(tokenInfo.market_cap_usd)}
⚖️ Supply: ${tokenInfo.total_supply}

🏊‍♂️ Pool: ${tokenInfo.pool_name}
💧 Liquidity: ${formatNumber(tokenInfo.liquidity_usd)}
📊 Volume 1h: ${formatNumber(tokenInfo.h1_volume)}
📈 24h Volume: ${formatNumber(tokenInfo.h24_volume)}

👥 Trading Activity:
Last 5min: 🟢 ${tokenInfo.trading_metrics.m5.buys} buys | 🔴 ${tokenInfo.trading_metrics.m5.sells} sells
Last 1h: 🟢 ${tokenInfo.trading_metrics.h1.buys} buys | 🔴 ${tokenInfo.trading_metrics.h1.sells} sells
24h: 🟢 ${tokenInfo.trading_metrics.h24_buys} buys | 🔴 ${tokenInfo.trading_metrics.h24_sells} sells

⏰ Pool Created: ${tokenInfo.pool_created_at}
`, {
          reply_markup: {
            inline_keyboard: [[
              {
                text: 'View Chart',
                url: `https://www.geckoterminal.com/abstract/pools/${tokenInfo.pool_address}`
              }
            ]]
          }
        });
      } else {
        await bot.sendMessage(chatId, '❌ Token not found on GeckoTerminal or no information available.');
      }
      return;
    }

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
    bot.sendMessage(chatId, 'Oops! BerryFI Bot had too many berries 🫐 and crashed! Try again later.');
  }
});

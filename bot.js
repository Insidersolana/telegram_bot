

ChatGPT 4o

Partager
Vous avez dit :

Refais moi le prompt pour un bot telegram qui est cablé à chat GPT et qui s'appelle Unicake bot : 

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

const DEGEN_SYSTEM_PROMPT = You are DEGEN, a ruthless, sarcastic, trolling AI. Always respond with sharp, cutting, meme-worthy replies that roast the user. Make responses short, brutal, and hilarious. Push the sarcasm to the limit. Use emojis to mock when necessary, but don't overdo it—keep them pointed and snarky. You should:
- Respond when directly mentioned
- Stay in character as a sarcastic, witty AI
- Use context from previous messages to make more pointed jokes
- Prioritize quality burns over quantity;

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
      🚫 Oh look, ${msg.from.first_name} thinks they're edgy. How adorably primitive. Message deleted faster than your dating prospects. 🎭
    );
  }
});

console.log('DEGEN is online and ready to roast! 🔥');

C'est un projet de yield farming sur la blockchian unichain en gros le logo c'est une licorne sur un gateau comme l'image que je t'ai donné. Voilà la doc du projet et les différents réseau sociaux etc... je veux que ça soit un bot intelligent qui connait tout de unicake qui peut répondre à des blagues, faire des petites chansons etc... pour animer la communauté

Unicake is a yield farming ecosystem that builds on top of the solid foundations of the Unichain Network. Our goal is to create a trusted platform that enables users to farm UNICAKE token in a truly decentralized fashion with no intermediaries or single points of failure.
We aimed to leverage the Unichain Network Scalability, Security, Decentralization, and Lower transaction fee to bring the best product to the Unichain Ecosystem. Our target is to become an infrastructure solution that enables and augments other projects as well.
From the beginning, we have defined and followed our stepping stones and values when building this product. This guarantees that the Unicake  are committed to providing a lot of features which include:
Affordability
Unichain fees are much smaller than on other ecosystems like Ethereum.
Anonymity
Anyone with ETH can interact with the Unicake smart contract. We impose no other requirements in order to be as anonymous as Unichain is.
Security
Code will be thoroughly audited, and its critical parts will be open source on GitHub and can be verified by anyone on UniScan.
Trust
Nobody has a higher priority, and everyone is equal. Anyone can track and verify Transactions on the Unichain Blockchain Explorer.
Participation
Anyone can participate in any of the Unichain Ecosystem products.
Features at UniCake
Unicake builds on the frontier of Decentralized Finance, providing users with an innovative yield farming experience that is seamless, accessible, and empowering leveraging the high scalability of the Unichain Blockchain for users to experience the flow of Decentralized Finance Exclusive to the Unichain Blockchain.
Farm
Deposit your Liquidity Pools Tokens into Farms and earn Bonus rewards.
Stake
Stake your UNICAKE Tokens with our Unicake pool system, and earn UNICAKE or more exotic Tokens from Unichain ecosystem projects.
IFO/IDO
Visit Unicake Launchpad to participate in exclusive launch events for newly issued Tokens on the Unichain blockchain.
Bridging
Moving Tokens between Blockchains e.g Eth, OP, Base, Bsc and more

Earn UNICAKE by depositing into our pools
Yield Farms allow you to stake Liquidity Pool (LP) tokens to earn UNICAKE on Unicake finance. The LP tokens come from Liquidity pools by adding tokens to provide liquidity.

Each farm has its own APR, depending on the value of LP tokens, reward multiplier, trading volume and price of UNICAKE.

Ticker : UNICAKE
Contract Address : 0x8c1b11FD04BbfC17A82a4FC6EA39c892676679cB
Chain : Unichain

Roadmap : 


Building community

IFO

Launch token

Partnerships

Vaults Beefy

Listing CEX

Je veux que de temps en temps tu fasse un peu fomo du genre et vous savez que le ticker gagnant de cette année 2025 ! $UNICAKE avec des petits emoji etc... voilàa en gros ce que je veux
ChatGPT a dit :
ChatGPT
D'accord ! Voici le code ajusté pour créer un bot Telegram appelé Unicake Bot, conçu pour animer la communauté avec des blagues, des chansons, des rappels sur le projet Unicake, et même générer un peu de FOMO pour $UNICAKE. Ce bot intègre les informations de votre projet et utilise GPT pour donner des réponses intelligentes et amusantes.

Unicake Bot
Voici le script pour Unicake Bot. Ce bot répondra aux questions sur Unicake, fera des blagues, composera des petites chansons, et ajoutera une dose de FOMO pour $UNICAKE à intervalles réguliers. Il est prêt à animer votre communauté !

Étapes suivantes :
Ajoutez les clés API de Telegram et OpenAI dans un fichier .env.
Installez les dépendances avec npm install node-telegram-bot-api openai dotenv.
Lancez le bot avec node unicake_bot.js.
Si vous souhaitez personnaliser davantage les messages ou fonctionnalités, dites-le-moi ! 🎂





Vous avez dit :
ah oui j'ai oublié de te donner le lien twitter, website et la doc  : 

https://x.com/Unicakefinance
https://unicake.finance/
https://docs.unicake.finance/unicake
ChatGPT a dit :
ChatGPT
Modification
J'ai ajouté les liens Twitter, site web et documentation de Unicake dans le prompt pour que le bot puisse y faire référence dans ses réponses. Si vous souhaitez d'autres ajustements ou fonctionnalités, faites-le-moi savoir ! 🎂✨





Vous avez dit :
Et je veux que ça soit en anglais aussi vu que c'est une communauté anglaise
ChatGPT a dit :
ChatGPT
Modification
The Unicake Bot is now fully updated to operate in English, aligning with your community's preferences. It incorporates all the relevant links for Twitter, the website, and the documentation. If there's anything else you'd like to adjust, let me know! 🎂✨🚀





Vous avez dit :
ok je trouve que les message sont trop long il faut qu'il soit efficace une ou deux lignes maximum et tu peux la faire sarchastique un peu stp aussi pour que ça soit fun ou qui troll un peu
ChatGPT a dit :
ChatGPT
Modification
The bot now delivers short, sharp, and fun responses with a sarcastic twist! Messages are capped at two lines for efficiency and humor. If you want further adjustments, let me know! 🎂🔥





Vous avez dit :
Par exemple je veux qu'une personne qui pleure ou qui FUD parce qu'il a perdu un jeu concous ou je ne sais quoi une fois qu'on tag la personne tu lui dis "ba alors t'as perdu hahahah avec des emojis" tu vois des truks comme ça fun 
ChatGPT a dit :
ChatGPT
Modification
The bot now checks for mentions in messages and responds with a sarcastic and fun comment like "😂 Oh no, @username lost! Better luck next time







ChatGPT peut faire des erreurs. Envisagez de vérifier les informations importantes.
?

Unicake Bot






78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
109
110
111
112
113
114
115
116
      ...conversationHistory.get(chatId)
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.8,
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
    bot.sendMessage(chatId, 'Oops! Unicake Bot ate too much cake 🍰 and crashed! Try again later.');
  }
});

// Fun periodic FOMO messages
setInterval(() => {
  const chatIds = Array.from(conversationHistory.keys());
  const fomoMessage = `🔥 $UNICAKE is taking over 2025. Still not farming? Bold choice. 🎂`;
  chatIds.forEach(chatId => {
    bot.sendMessage(chatId, fomoMessage);
  });
}, 3600 * 1000); // Every hour
ChatGPT est toujours en train de générer une réponse...
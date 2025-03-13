// Bitcoin Discord Bot
// Pastikan Anda telah menginstal package-package berikut:
// npm install discord.js node-fetch@2.6.7 dotenv

// Import dependencies
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

// Membuat client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Prefix untuk perintah bot
const prefix = '!';

// API endpoint untuk mendapatkan harga cryptocurrency
const CRYPTO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,xrp,dogecoin,polkadot,binancecoin,manta-network&vs_currencies=usd,idr,eur&include_24hr_change=true';

// Daftar nama tampilan cryptocurrency
const CRYPTO_NAMES = {
  'bitcoin': 'Bitcoin (BTC)',
  'ethereum': 'Ethereum (ETH)',
  'solana': 'Solana (SOL)',
  'cardano': 'Cardano (ADA)',
  'xrp': 'Ripple (XRP)',
  'dogecoin': 'Dogecoin (DOGE)',
  'polkadot': 'Polkadot (DOT)',
  'binancecoin': 'Binance Coin (BNB)',
  'manta-network': 'Manta Network (MANTA)'
};

// Event ketika bot siap
client.once('ready', () => {
  console.log(`Bot telah online sebagai ${client.user.tag}`);
  client.user.setActivity('Bitcoin Price', { type: 'WATCHING' });
});

// Event ketika ada pesan
client.on('messageCreate', async (message) => {
  // Mengabaikan pesan dari bot lain dan pesan yang tidak dimulai dengan prefix
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  // Mendapatkan argumen perintah
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Perintah untuk mendapatkan harga cryptocurrency
  if (command === 'bitcoin' || command === 'btc' || 
      command === 'ethereum' || command === 'eth' ||
      command === 'solana' || command === 'sol' ||
      command === 'cardano' || command === 'ada' ||
      command === 'xrp' || 
      command === 'dogecoin' || command === 'doge' ||
      command === 'polkadot' || command === 'dot' ||
      command === 'binancecoin' || command === 'bnb' ||
      command === 'manta' || command === 'manta-network') {
    
    try {
      // Mengirim indikator typing selama fetch API
      message.channel.sendTyping();
      
      // Menentukan cryptocurrency ID berdasarkan command
      let cryptoId;
      
      switch(command) {
        case 'bitcoin':
        case 'btc':
          cryptoId = 'bitcoin';
          break;
        case 'ethereum':
        case 'eth':
          cryptoId = 'ethereum';
          break;
        case 'solana':
        case 'sol':
          cryptoId = 'solana';
          break;
        case 'cardano':
        case 'ada':
          cryptoId = 'cardano';
          break;
        case 'xrp':
          cryptoId = 'xrp';
          break;
        case 'dogecoin':
        case 'doge':
          cryptoId = 'dogecoin';
          break;
        case 'polkadot':
        case 'dot':
          cryptoId = 'polkadot';
          break;
        case 'binancecoin':
        case 'bnb':
          cryptoId = 'binancecoin';
          break;
        case 'manta':
        case 'manta-network':
          cryptoId = 'manta-network';
          break;
      }
      
      // Fetch data dari API
      const response = await fetch(CRYPTO_API_URL);
      const data = await response.json();
      
      // Format data harga cryptocurrency
      const cryptoData = data[cryptoId];
      
      // Cek apakah data ada
      if (!cryptoData) {
        return message.reply(`Maaf, tidak dapat mengambil data ${CRYPTO_NAMES[cryptoId]} saat ini. Silakan coba lagi nanti.`);
      }
      
      // Format perubahan 24 jam dengan tanda + atau -
      const usdChange = cryptoData.usd_24h_change ? cryptoData.usd_24h_change.toFixed(2) : 'N/A';
      const idrChange = cryptoData.idr_24h_change ? cryptoData.idr_24h_change.toFixed(2) : 'N/A';
      const eurChange = cryptoData.eur_24h_change ? cryptoData.eur_24h_change.toFixed(2) : 'N/A';
      
      // Menentukan warna embed berdasarkan perubahan harga
      const embedColor = cryptoData.usd_24h_change >= 0 ? '#00FF00' : '#FF0000';
      
      // Membuat embed
      const cryptoEmbed = new EmbedBuilder()
        .setTitle(`💰 ${CRYPTO_NAMES[cryptoId]} Price Info`)
        .setColor(embedColor)
        .setDescription(`Informasi harga ${CRYPTO_NAMES[cryptoId]} saat ini`)
        .addFields(
          { name: '💵 USD', value: `${cryptoData.usd.toLocaleString()} (${usdChange}%)`, inline: true },
          { name: '💴 IDR', value: `Rp${cryptoData.idr.toLocaleString()} (${idrChange}%)`, inline: true },
          { name: '💶 EUR', value: `€${cryptoData.eur.toLocaleString()} (${eurChange}%)`, inline: true }
        )
        .setFooter({ text: 'Data dari CoinGecko API' })
        .setTimestamp();
      
      // Kirim embed ke channel
      message.reply({ embeds: [cryptoEmbed] });
    } catch (error) {
      console.error('Error fetching cryptocurrency data:', error);
      message.reply('Terjadi kesalahan saat mengambil data cryptocurrency. Silakan coba lagi nanti.');
    }
  }
  
  // Perintah mendapatkan semua harga cryptocurrency
  else if (command === 'crypto' || command === 'all') {
    try {
      // Mengirim indikator typing selama fetch API
      message.channel.sendTyping();
      
      // Fetch data dari API
      const response = await fetch(CRYPTO_API_URL);
      const data = await response.json();
      
      // Cek apakah data ada
      if (!data || Object.keys(data).length === 0) {
        return message.reply('Maaf, tidak dapat mengambil data cryptocurrency saat ini. Silakan coba lagi nanti.');
      }
      
      // Membuat embed
      const allCryptoEmbed = new EmbedBuilder()
        .setTitle('💰 Cryptocurrency Price Summary')
        .setColor('#0099ff')
        .setDescription('Informasi harga cryptocurrency saat ini dalam USD')
        .setFooter({ text: 'Data dari CoinGecko API' })
        .setTimestamp();
      
      // Menambahkan field untuk setiap cryptocurrency
      Object.keys(data).forEach(cryptoId => {
        const cryptoData = data[cryptoId];
        const usdChange = cryptoData.usd_24h_change ? cryptoData.usd_24h_change.toFixed(2) : 'N/A';
        const changeEmoji = cryptoData.usd_24h_change >= 0 ? '🟢' : '🔴';
        
        allCryptoEmbed.addFields({
          name: CRYPTO_NAMES[cryptoId],
          value: `${cryptoData.usd.toLocaleString()} (${changeEmoji} ${usdChange}%)`,
          inline: true
        });
      });
      
      // Kirim embed ke channel
      message.reply({ embeds: [allCryptoEmbed] });
    } catch (error) {
      console.error('Error fetching all cryptocurrency data:', error);
      message.reply('Terjadi kesalahan saat mengambil data cryptocurrency. Silakan coba lagi nanti.');
    }
  }
  
  // Perintah bantuan
  else if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🤖 Crypto Price Tracker Commands')
      .setColor('#0099ff')
      .setDescription('Daftar perintah yang tersedia:')
      .addFields(
        { name: `${prefix}btc atau ${prefix}bitcoin`, value: 'Menampilkan harga Bitcoin terkini', inline: true },
        { name: `${prefix}eth atau ${prefix}ethereum`, value: 'Menampilkan harga Ethereum terkini', inline: true },
        { name: `${prefix}sol atau ${prefix}solana`, value: 'Menampilkan harga Solana terkini', inline: true },
        { name: `${prefix}ada atau ${prefix}cardano`, value: 'Menampilkan harga Cardano terkini', inline: true },
        { name: `${prefix}xrp`, value: 'Menampilkan harga XRP terkini', inline: true },
        { name: `${prefix}doge atau ${prefix}dogecoin`, value: 'Menampilkan harga Dogecoin terkini', inline: true },
        { name: `${prefix}dot atau ${prefix}polkadot`, value: 'Menampilkan harga Polkadot terkini', inline: true },
        { name: `${prefix}bnb atau ${prefix}binancecoin`, value: 'Menampilkan harga Binance Coin terkini', inline: true },
        { name: `${prefix}manta atau ${prefix}manta-network`, value: 'Menampilkan harga Manta Network terkini', inline: true },
        { name: `${prefix}crypto atau ${prefix}all`, value: 'Menampilkan ringkasan harga semua cryptocurrency', inline: false },
        { name: `${prefix}help`, value: 'Menampilkan daftar perintah', inline: false }
      )
      .setFooter({ text: 'Cryptocurrency Price Tracker Bot' });
    
    message.reply({ embeds: [helpEmbed] });
  }
});

// Login bot menggunakan token
client.login(process.env.DISCORD_TOKEN);

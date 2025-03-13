// Import dependencies
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const fetch = require('node-fetch');
const cron = require('node-cron');
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

// API untuk mendapatkan data historis (7 hari terakhir)
const CRYPTO_HISTORY_API = (cryptoId) => `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=7&interval=daily`;

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

// Function untuk mendapatkan data cryptocurrency terbaru
async function fetchCryptoData() {
  try {
    const response = await fetch(CRYPTO_API_URL);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching cryptocurrency data:', error);
    return null;
  }
}

// Function untuk mendapatkan data historis dan membuat URL chart (VERSI YANG DITINGKATKAN)
async function getChartUrl(cryptoId) {
  try {
    const response = await fetch(CRYPTO_HISTORY_API(cryptoId));
    const data = await response.json();
    
    if (!data || !data.prices || data.prices.length === 0) {
      console.error(`Tidak ada data historis untuk ${cryptoId}`);
      return null;
    }
    
    // Mengekstrak harga (maksimal 7 titik data untuk URL yang lebih pendek)
    const allPrices = data.prices;
    // Filter untuk mendapatkan poin yang merata sepanjang periode
    const step = Math.max(1, Math.floor(allPrices.length / 7));
    const filteredPrices = [];
    
    for (let i = 0; i < allPrices.length; i += step) {
      if (filteredPrices.length < 7) {
        filteredPrices.push(allPrices[i]);
      }
    }
    
    // Pastikan poin terakhir selalu ada
    if (filteredPrices[filteredPrices.length - 1] !== allPrices[allPrices.length - 1]) {
      filteredPrices.push(allPrices[allPrices.length - 1]);
    }
    
    // Format data untuk chart
    const prices = filteredPrices.map(item => parseFloat(item[1].toFixed(2)));
    
    // Format tanggal yang lebih sederhana
    const labels = filteredPrices.map(item => {
      const date = new Date(item[0]);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    // Tentukan apakah trend positif atau negatif
    const isPositive = prices[0] < prices[prices.length - 1];
    const chartColor = isPositive ? '75,192,75' : '255,99,99';
    
    // Buat chart dengan parameter yang lebih sederhana
    return `https://quickchart.io/chart?w=500&h=300&c={
      "type":"line",
      "data":{
        "labels":[${labels.map(l => `"${l}"`).join(',')}],
        "datasets":[{
          "label":"Price (USD)",
          "data":[${prices.join(',')}],
          "fill":false,
          "borderColor":"rgba(${chartColor},1)",
          "tension":0.4
        }]
      },
      "options":{
        "plugins":{
          "title":{"display":true,"text":"${CRYPTO_NAMES[cryptoId]} - 7 Day Chart"}
        },
        "scales":{"y":{"beginAtZero":false}}
      }
    }`;
  } catch (error) {
    console.error(`Error generating chart for ${cryptoId}:`, error);
    return null;
  }
}

// Function untuk mengirim update pagi hari
async function sendMorningUpdate(channel) {
  try {
    const data = await fetchCryptoData();
    
    if (!data || Object.keys(data).length === 0) {
      return console.error('Tidak dapat mengambil data cryptocurrency untuk update pagi');
    }
    
    // Membuat embed untuk update pagi
    const morningUpdateEmbed = new EmbedBuilder()
      .setTitle('🌅 Update Harga Cryptocurrency Pagi Ini')
      .setColor('#f7931a') // Warna Bitcoin orange
      .setDescription('Berikut adalah ringkasan harga cryptocurrency pagi ini:')
      .setFooter({ text: 'Update Otomatis Pagi Hari • Data dari CoinGecko API' })
      .setTimestamp();
    
    // Menambahkan field untuk setiap cryptocurrency
    Object.keys(data).forEach(cryptoId => {
      const cryptoData = data[cryptoId];
      const usdChange = cryptoData.usd_24h_change ? cryptoData.usd_24h_change.toFixed(2) : 'N/A';
      const changeEmoji = cryptoData.usd_24h_change >= 0 ? '🟢' : '🔴';
      
      morningUpdateEmbed.addFields({
        name: CRYPTO_NAMES[cryptoId],
        value: `$${cryptoData.usd.toLocaleString()} (${changeEmoji} ${usdChange}%)`,
        inline: true
      });
    });
    
    // Tambahkan chart Bitcoin sebagai thumbnail
    try {
      const btcChartUrl = await getChartUrl('bitcoin');
      if (btcChartUrl) {
        console.log("Morning update chart URL:", btcChartUrl.substring(0, 100) + "...");
        morningUpdateEmbed.setImage(btcChartUrl);
      }
    } catch (chartError) {
      console.error('Error adding Bitcoin chart to morning update:', chartError);
    }
    
    // Kirim embed ke channel
    channel.send({ embeds: [morningUpdateEmbed] });
    
    console.log(`Update pagi berhasil dikirim ke channel ${channel.name}`);
  } catch (error) {
    console.error('Error mengirim update pagi:', error);
  }
}

// Event ketika bot siap
client.once('ready', () => {
  console.log(`Bot telah online sebagai ${client.user.tag}`);
  client.user.setActivity('Crypto Prices', { type: ActivityType.Watching });
  
  // Jadwalkan update pagi setiap hari jam 7 pagi
  // Format: detik menit jam tanggal bulan hari-minggu
  cron.schedule('0 0 7 * * *', () => {
    console.log('Menjalankan update pagi otomatis...');
    
    // Kirim update ke channel yang ditentukan
    // Ganti 'channel-id' dengan ID channel Discord yang ingin menerima update
    const updateChannel = client.channels.cache.get(process.env.UPDATE_CHANNEL_ID);
    
    if (updateChannel) {
      sendMorningUpdate(updateChannel);
    } else {
      console.error('Channel untuk update pagi tidak ditemukan. Pastikan UPDATE_CHANNEL_ID diatur dengan benar.');
    }
  }, {
    timezone: "Asia/Jakarta" // Sesuaikan dengan zona waktu Anda
  });
  
  console.log('Update otomatis pagi hari telah dijadwalkan untuk jam 7:00 WIB setiap hari');
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
          { name: '💵 USD', value: `$${cryptoData.usd.toLocaleString()} (${usdChange}%)`, inline: true },
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
  
  // Perintah untuk melihat chart cryptocurrency
  else if (command === 'chart') {
    const crypto = args[0]?.toLowerCase();
    
    // Jika tidak ada argumen, tampilkan pesan bantuan
    if (!crypto) {
      return message.reply('Silakan tentukan cryptocurrency untuk chart. Contoh: `!chart btc` atau `!chart ethereum`');
    }
    
    // Menentukan cryptocurrency ID berdasarkan input
    let cryptoId;
    
    switch(crypto) {
      case 'btc':
      case 'bitcoin':
        cryptoId = 'bitcoin';
        break;
      case 'eth':
      case 'ethereum':
        cryptoId = 'ethereum';
        break;
      case 'sol':
      case 'solana':
        cryptoId = 'solana';
        break;
      case 'ada':
      case 'cardano':
        cryptoId = 'cardano';
        break;
      case 'xrp':
        cryptoId = 'xrp';
        break;
      case 'doge':
      case 'dogecoin':
        cryptoId = 'dogecoin';
        break;
      case 'dot':
      case 'polkadot':
        cryptoId = 'polkadot';
        break;
      case 'bnb':
      case 'binancecoin':
        cryptoId = 'binancecoin';
        break;
      case 'manta':
        cryptoId = 'manta-network';
        break;
      default:
        return message.reply(`Cryptocurrency tidak dikenal: ${crypto}. Gunakan nama seperti btc, eth, sol, ada, xrp, doge, dot, bnb, manta.`);
    }
    
    try {
      // Mengirim indikator typing selama proses
      message.channel.sendTyping();
      
      // Mendapatkan data cryptocurrency
      const cryptoData = await fetchCryptoData();
      
      if (!cryptoData || !cryptoData[cryptoId]) {
        return message.reply(`Maaf, tidak dapat mengambil data untuk ${CRYPTO_NAMES[cryptoId]}.`);
      }
      
      // Mendapatkan URL chart
      const chartUrl = await getChartUrl(cryptoId);
      
      if (!chartUrl) {
        return message.reply(`Maaf, tidak dapat membuat chart untuk ${CRYPTO_NAMES[cryptoId]}.`);
      }
      
      // Log URL untuk debugging
      console.log(`Chart URL for ${cryptoId}:`, chartUrl.substring(0, 100) + "...");
      
      // Mengambil data harga
      const currentData = cryptoData[cryptoId];
      const usdChange = currentData.usd_24h_change ? currentData.usd_24h_change.toFixed(2) : 'N/A';
      const changeEmoji = currentData.usd_24h_change >= 0 ? '🟢' : '🔴';
      
      // Membuat embed
      const chartEmbed = new EmbedBuilder()
        .setTitle(`📊 ${CRYPTO_NAMES[cryptoId]} - 7 Day Price Chart`)
        .setColor(currentData.usd_24h_change >= 0 ? '#00FF00' : '#FF0000')
        .setDescription(`Current price: $${currentData.usd.toLocaleString()} (${changeEmoji} ${usdChange}%)`)
        .setImage(chartUrl)
        .setFooter({ text: 'Data dari CoinGecko API • Chart dari QuickChart.io' })
        .setTimestamp();
      
      // Kirim embed ke channel
      message.reply({ embeds: [chartEmbed] });
      
    } catch (error) {
      console.error(`Error processing chart command:`, error);
      message.reply(`Terjadi kesalahan saat membuat chart. Silakan coba lagi nanti.`);
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
          value: `$${cryptoData.usd.toLocaleString()} (${changeEmoji} ${usdChange}%)`,
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
        { name: `${prefix}chart [crypto]`, value: 'Menampilkan grafik harga 7 hari. Contoh: !chart btc', inline: false },
        { name: `${prefix}crypto atau ${prefix}all`, value: 'Menampilkan ringkasan harga semua cryptocurrency', inline: false },
        { name: `${prefix}help`, value: 'Menampilkan daftar perintah', inline: false }
      )
      .setFooter({ text: 'Cryptocurrency Price Tracker Bot' });
    
    message.reply({ embeds: [helpEmbed] });
  }
});

// Login bot menggunakan token
client.login(process.env.DISCORD_TOKEN);

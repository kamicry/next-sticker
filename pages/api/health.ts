import axios from 'axios';

const REMOTE_CONFIG = {
  charactersUrl: process.env.CHARACTERS_URL || 'https://raw.githubusercontent.com/lgc-NB2Dev/meme-stickers-hub/main/characters.json'
};

export default async function handler(req, res) {
  try {
    // 测试远程配置加载
    const configResponse = await axios.get(REMOTE_CONFIG.charactersUrl, {
      timeout: 5000
    });
    
    const configs = configResponse.data;
    
    res.status(200).json({
      status: 'healthy',
      characters: configs.length,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

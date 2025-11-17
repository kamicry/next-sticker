import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const REMOTE_CONFIG = {
  charactersUrl: process.env.CHARACTERS_URL || 'https://raw.githubusercontent.com/lgc-NB2Dev/meme-stickers-hub/main/characters.json'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    // 类型安全的错误处理
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      status: 'unhealthy',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

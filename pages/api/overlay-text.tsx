import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';

// 远程配置URL（可以通过环境变量配置）
const REMOTE_CONFIG = {
  charactersUrl: process.env.CHARACTERS_URL || 'https://raw.githubusercontent.com/kamicry/koishi-plugin-pjsk-pptr/main/src/assets/characters.json',
  fonts: {
    YurukaStd: process.env.FONT_YURUKA_URL || 'https://raw.githubusercontent.com/kamicry/koishi-plugin-pjsk-pptr/main/src/assets/fonts/YurukaStd.woff2',
    SSFangTangTi: process.env.FONT_SSFANG_URL || 'https://raw.githubusercontent.com/kamicry/koishi-plugin-pjsk-pptr/main/src/assets/fonts/ShangShouFangTangTi.woff2'
   
  }
};

// 缓存
//let characterConfigs = null;
let characterConfigs: any = null; 
let fontsLoaded = false;

// 加载远程角色配置
async function loadCharacterConfigs() {
  if (characterConfigs) return characterConfigs;
  
  try {
    const response = await axios.get(REMOTE_CONFIG.charactersUrl, {
      timeout: 10000
    });
    characterConfigs = response.data;
    console.log(`Loaded ${characterConfigs.length} character configurations`);
    return characterConfigs;
  } catch (error) {
    console.error('Failed to load character configs:',  (error as Error).message);
    throw new Error('无法加载角色配置');
  }
}

// 加载远程字体
async function loadFonts() {
  if (fontsLoaded) return true;
  
  try {
    const fontPromises = Object.entries(REMOTE_CONFIG.fonts).map(async ([fontName, fontUrl]) => {
      try {
        const response = await axios.get(fontUrl, {
          responseType: 'arraybuffer',
          timeout: 15000
        });
        GlobalFonts.register(Buffer.from(response.data), fontName);
        console.log(`Loaded font: ${fontName}`);
      } catch (error) {
        console.warn(`Failed to load font ${fontName}:`,  (error as Error).message);
      }
    });
    
    await Promise.allSettled(fontPromises);
    fontsLoaded = true;
    return true;
  } catch (error) {
    console.error('Failed to load fonts:',  (error as Error).message);
    // 即使字体加载失败，也继续运行
    return false;
  }
}

// 默认配置
const defaultConfig = {
  isTextSizeAdaptationEnabled: true,
  defaultCharacter: {
    id: "default",
    name: "Default",
    character: "default",
    img: "default.png",
    color: "#333333",
    defaultText: {
      text: "",
      x: 0.5,
      y: 0.5,
      r: 0,
      s: 60
    }
  }
};

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<any> // 或者指定具体的响应类型
)  {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    path: imageUrl, 
    key: inputText, 
    character: characterId,
    font = 'YurukaStd',
    disableAdaptiveFunctionality = 'false'
  } = req.query;

  // 验证参数
  if (!imageUrl || !inputText) {
    return res.status(400).json({ 
      error: 'Missing required parameters: path and key' 
    });
  }

  // 验证URL格式
  try {
  // 确保 imageUrl 是字符串，如果是数组则取第一个元素
  const urlToValidate = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  new URL(urlToValidate);
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid image URL format' 
    });
  }

  try {
    // 并行加载配置和字体
    const [configs, fontsReady] = await Promise.all([
      loadCharacterConfigs(),
      loadFonts()
    ]);

    // 下载图片
    const imageResponse = await axios({
      method: 'GET',
      url: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl, // 这里也要处理
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
    });

    // 检查图片大小
    if (imageResponse.data.length > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'Image too large, maximum size is 5MB' 
      });
    }

    // 加载图片
    const image = await loadImage(Buffer.from(imageResponse.data));
    
    // 限制画布大小（Vercel内存限制）
    const maxDimension = 2000;
    if (image.width > maxDimension || image.height > maxDimension) {
      return res.status(400).json({ 
        error: `Image dimensions too large, maximum is ${maxDimension}x${maxDimension}` 
      });
    }

    // 创建canvas
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');

    // 绘制图片
    context.drawImage(image, 0, 0, image.width, image.height);

    // 获取角色配置
    const characterConfig = getCharacterConfigByImageUrl(imageUrl, characterId, configs);
    const { color, defaultText } = characterConfig;
    let { x, y, r: rotate, s: fontSize } = defaultText;

    // 处理文本
    const text = processText(Array.isArray(inputText) ? inputText[0] : inputText);
    const lines = text.split('\n');

    // 文本自适应逻辑
    let specifiedX = x;
    let specifiedY = y;
    let specifiedFontSize = fontSize;
    let spaceSize = calculateInitialSpaceSize(fontSize);

    // 检查字体是否可用
    const availableFonts = Object.keys(REMOTE_CONFIG.fonts);
    const finalFont = availableFonts.includes(font) ? font : 'YurukaStd';

    // 自适应逻辑
    const shouldAdapt = !(disableAdaptiveFunctionality === 'true');
    if (shouldAdapt) {
      const longestLine = findLongestLine(lines);
      const offsets = calculateOffsets(longestLine, specifiedFontSize, finalFont, image.width);
      specifiedX += offsets.x;
      specifiedY += offsets.y;
      specifiedFontSize = calculateFontSize(specifiedFontSize, longestLine, image.width);
      spaceSize = calculateAdaptiveSpaceSize(specifiedFontSize, lines.length);
    }

    // 设置文本样式
    context.font = `${specifiedFontSize}px ${finalFont}`;
    context.lineWidth = 9;
    context.strokeStyle = "white";
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // 坐标变换
    context.save();
    context.translate(specifiedX, specifiedY);
    context.rotate(rotate / 10);

    // 渲染文本
    for (let i = 0, k = 0; i < lines.length; i++) {
      const lineY = k - (lines.length - 1) * spaceSize / 2;
      context.strokeText(lines[i], 0, lineY);
      context.fillText(lines[i], 0, lineY);
      k += spaceSize;
    }

    context.restore();

    // 转换为Buffer
    const buffer = canvas.toBuffer('image/png');

    // 设置响应头
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=3600');

    // 返回图片
    res.send(buffer);

  } catch (error) {
    console.error('Error processing image:', error);
    
    // 提供更友好的错误信息
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(400).json({ 
        error: 'Cannot fetch image from the provided URL' 
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(400).json({ 
        error: 'Image not found at the provided URL' 
      });
    }
    
    if (error.message === '无法加载角色配置') {
      return res.status(500).json({ 
        error: 'Failed to load character configurations from remote source' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 工具函数 - 通过图片URL匹配角色配置
function getCharacterConfigByImageUrl(imageUrl, characterId, configs) {
  // 如果提供了characterId，优先使用
  if (characterId) {
    const config = getCharacterConfigById(characterId, configs);
    if (config) return config;
  }

  // 从URL中提取图片路径
  const imagePath = extractImagePathFromUrl(imageUrl);
  
  // 在角色配置中查找匹配的img字段
  const matchedConfig = configs.find(char => {
    // 完全匹配或路径包含关系
    return char.img === imagePath || 
           imagePath.includes(char.img) || 
           char.img.includes(imagePath) ||
           imageUrl.includes(char.img);
  });

  if (matchedConfig) {
    console.log(`Matched character: ${matchedConfig.name} for image: ${imagePath}`);
    return matchedConfig;
  }

  console.log(`No character match found for image: ${imagePath}, using default`);
  return defaultConfig.defaultCharacter;
}

function getCharacterConfigById(characterId, configs) {
  // 先按ID查找
  let config = configs.find(char => char.id === characterId);
  if (config) return config;

  // 按名称查找
  config = configs.find(char => char.name === characterId);
  if (config) return config;

  // 按角色字段查找
  config = configs.find(char => char.character === characterId);
  if (config) return config;

  return null;
}

function extractImagePathFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // 提取最后两级路径，如 "airi/Airi_01.png"
    const pathParts = pathname.split('/').filter(part => part);
    if (pathParts.length >= 2) {
      return `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1]}`;
    }
    
    // 如果只有一级路径，返回文件名
    return pathParts.pop() || 'default';
  } catch (error) {
    console.error('Error extracting image path from URL:', error);
    return 'default';
  }
}

function processText(inputText) {
  // 支持多种换行符格式：\\n, \n, /+/ 
  return inputText
    .replace(/\/+/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');
}

function findLongestLine(lines) {
  return lines.reduce((longest, current) => 
    current.length > longest.length ? current : longest, '');
}

function calculateOffsets(longestLine, fontSize, fontFamily, canvasWidth) {
  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = `${fontSize}px ${fontFamily}`;
  const textWidth = tempCtx.measureText(longestLine).width;
  
  // 如果文本宽度超过画布宽度的80%，进行偏移调整
  if (textWidth > canvasWidth * 0.8) {
    return {
      x: -textWidth * 0.1,
      y: 0
    };
  }
  
  return { x: 0, y: 0 };
}

function calculateFontSize(baseSize, longestLine, canvasWidth) {
  const maxLength = 15; // 最大字符长度基准
  const minSize = 16;   // 最小字体大小
  const maxSize = 120;  // 最大字体大小
  
  if (longestLine.length <= maxLength) {
    return Math.min(maxSize, baseSize);
  }
  
  // 根据长度等比缩小
  const lengthRatio = maxLength / Math.max(longestLine.length, 1);
  const calculatedSize = baseSize * lengthRatio;
  
  // 同时考虑画布宽度限制
  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = `${calculatedSize}px YurukaStd`;
  const textWidth = tempCtx.measureText(longestLine).width;
  
  if (textWidth > canvasWidth * 0.8) {
    const widthRatio = (canvasWidth * 0.8) / textWidth;
    return Math.max(minSize, Math.floor(calculatedSize * widthRatio));
  }
  
  return Math.max(minSize, Math.floor(calculatedSize));
}

function calculateInitialSpaceSize(fontSize) {
  return fontSize + 20; // 基础行间距
}

function calculateAdaptiveSpaceSize(fontSize, lineCount) {
  const baseSpace = fontSize + 10;
  // 行数越多，行间距相对越小
  if (lineCount > 3) {
    return baseSpace * (3 / lineCount);
  }
  return baseSpace;
}

export const config = {
  api: {
    responseLimit: '10mb',
    bodyParser: false,
  },
};

import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';

// 远程配置URL（可以通过环境变量配置）
const CHARACTERS_URLS: Record<string, string> = {
  pjsk: process.env.CHARACTERS_URL_PJSK || process.env.CHARACTERS_URL || 'https://raw.githubusercontent.com/kamicry/arcpjsk-hub/main/pjsk/characters.json',
  arcaea: process.env.CHARACTERS_URL_ARCAEA || process.env.CHARACTERS_URL || 'https://raw.githubusercontent.com/kamicry/arcpjsk-hub/main/arcaea/characters.json',
};

const REMOTE_CONFIG = {
  fonts: {
    YurukaStd:
      process.env.FONT_YURUKA_URL ||
      'https://media.githubusercontent.com/media/kamicry/koishi-plugin-pjsk-pptr/main/src/assets/fonts/YurukaStd.woff2',
    SSFangTangTi:
      process.env.FONT_SSFANG_URL ||
      'https://media.githubusercontent.com/media/kamicry/koishi-plugin-pjsk-pptr/main/src/assets/fonts/ShangShouFangTangTi.woff2'
  }
};

const LOCAL_FONT_PATHS: Partial<Record<string, string>> = {
  YurukaStd: path.join(process.cwd(), 'public', 'fonts', 'YurukaStd.woff2'),
  SSFangTangTi: path.join(process.cwd(), 'public', 'fonts', 'ShangShouFangTangTi.woff2')
};

// 缓存
//let characterConfigs = null;
let characterConfigs: any = null; 
let fontsLoaded = false;

// 加载远程角色配置
async function loadCharacterConfigs(type: string = 'pjsk') {
  const configType = CHARACTERS_URLS[type] ? type : 'pjsk';
  const url = CHARACTERS_URLS[configType];

  if (characterConfigs && characterConfigs._type === configType) return characterConfigs;

  try {
    const response = await axios.get(url, {
      timeout: 10000
    });
    characterConfigs = response.data;
    characterConfigs._type = configType;
    console.log(`Loaded ${characterConfigs.length} character configurations for type: ${configType}`);
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
    const fontEntries = Object.entries(REMOTE_CONFIG.fonts);

    if (fontEntries.every(([fontName]) => GlobalFonts.has(fontName))) {
      fontsLoaded = true;
      return true;
    }

    const results = await Promise.all(
      fontEntries.map(async ([fontName, fontUrl]) => {
        if (GlobalFonts.has(fontName)) {
          return true;
        }

        const localPath = LOCAL_FONT_PATHS[fontName];

        if (localPath && existsSync(localPath)) {
          try {
            const fontBuffer = await fs.readFile(localPath);
            const fontKey = GlobalFonts.register(fontBuffer, fontName);
            if (fontKey) {
              console.log(`Loaded font ${fontName} from local file`);
              return true;
            }
            console.warn(`Registering local font ${fontName} returned null`);
          } catch (error) {
            console.warn(`Failed to load local font ${fontName}:`, (error as Error).message);
          }
        } else if (localPath) {
          console.warn(`Local font file for ${fontName} not found at ${localPath}`);
        }

        try {
          const response = await axios.get(fontUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
          });
          const fontKey = GlobalFonts.register(Buffer.from(response.data), fontName);
          if (fontKey) {
            console.log(`Loaded font ${fontName} from remote source`);
            return true;
          }
          console.warn(`Registering remote font ${fontName} returned null`);
        } catch (error) {
          console.warn(`Failed to load remote font ${fontName}:`, (error as Error).message);
        }

        return false;
      })
    );

    fontsLoaded = fontEntries.every(([fontName]) => GlobalFonts.has(fontName));
    return fontsLoaded || results.some(Boolean);
  } catch (error) {
    console.error('Failed to load fonts:', (error as Error).message);
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
    strokeColor: "white",
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
    disableAdaptiveFunctionality = 'false',
    type = 'pjsk',
    bg = '',
    bg2 = ''
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
    // 解析 type 参数
    const configType = Array.isArray(type) ? type[0] : type;

    // 并行加载配置和字体
    const [configs, fontsReady] = await Promise.all([
      loadCharacterConfigs(configType),
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

    // 处理背景颜色
    function resolveColor(c: string): string | null {
      if (c === 'w') return '#FFFFFF';
      if (c === 'b') return '#000000';
      if (c === 't') return null;
      if (c.startsWith('#') || c.startsWith('rgb')) return c;
      return `#${c}`;
    }
    const mainColor = Array.isArray(bg) ? bg[0] : bg;
    const secondColor = Array.isArray(bg2) ? bg2[0] : bg2;
    if (mainColor && secondColor && mainColor !== 't' && secondColor !== 't') {
      // 渐变背景
      const gradient = context.createLinearGradient(0, 0, image.width, image.height);
      gradient.addColorStop(0, resolveColor(mainColor)!);
      gradient.addColorStop(1, resolveColor(secondColor)!);
      context.fillStyle = gradient;
      context.fillRect(0, 0, image.width, image.height);
    } else if (mainColor && mainColor !== 't') {
      // 单色背景
      context.fillStyle = resolveColor(mainColor)!;
      context.fillRect(0, 0, image.width, image.height);
    }

    // 绘制图片
    context.drawImage(image, 0, 0, image.width, image.height);

    // 获取角色配置
    const characterConfig = getCharacterConfigByImageUrl(Array.isArray(imageUrl) ? imageUrl[0] : imageUrl, characterId, configs);
    const { color, strokeColor, defaultText } = characterConfig;
    let { x, y, r: rotate, s: fontSize } = defaultText;

    // 按图片分辨率等比例缩放坐标和字号（角色配置以 256px 参考尺寸设计）
    const scaleFactor = Math.min(image.width, image.height) / 256;
    x = Math.round(x * scaleFactor - 15 * scaleFactor);
    y = Math.round(y * scaleFactor);
    fontSize = Math.max(12, Math.round(fontSize * scaleFactor));
    const lineWidth = Math.max(3, Math.round(9 * scaleFactor));

    // 处理文本
    const text = processText(Array.isArray(inputText) ? inputText[0] : inputText);
    const lines = text.split('\n');

    // 文本自适应逻辑
    let specifiedX = x;
    let specifiedY = y;
    let specifiedFontSize = fontSize;
    let spaceSize = calculateAdaptiveSpaceSize(fontSize, Math.max(lines.length, 1));

    // 检查字体是否可用
    const availableFonts = Object.keys(REMOTE_CONFIG.fonts);
    const fontString = Array.isArray(font) ? font[0] : font;
    const finalFont = availableFonts.includes(fontString) ? fontString : 'YurukaStd';
    const fontStack = buildFontStack(finalFont);

    // 自适应逻辑
    const disableAdaptiveString = Array.isArray(disableAdaptiveFunctionality) ? disableAdaptiveFunctionality[0] : disableAdaptiveFunctionality;
    const shouldAdapt = !(disableAdaptiveString === 'true');
    if (shouldAdapt) {
      const { fontSize: adaptedFontSize, lineSpacing } = fitFontSizeToCanvas(
        lines,
        specifiedFontSize,
        image.width,
        image.height,
        fontStack
      );
      specifiedFontSize = adaptedFontSize;
      spaceSize = lineSpacing;
      const offsets = calculateOffsets(lines, specifiedFontSize, fontStack, image.width);
      specifiedX += offsets.x;
      specifiedY += offsets.y;
    } else {
      spaceSize = calculateAdaptiveSpaceSize(specifiedFontSize, Math.max(lines.length, 1));
    }

    // 设置文本样式
    context.font = createFontDeclaration(specifiedFontSize, fontStack);
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeColor || "white";
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
  // 将 error 断言为具有 code 属性的类型
    const err = error as any;
    // 提供更友好的错误信息
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(400).json({ 
        error: 'Cannot fetch image from the provided URL' 
      });
    }
    
    if (err.response?.status === 404) {
      return res.status(400).json({ 
        error: 'Image not found at the provided URL' 
      });
    }
    
    if (err.message === '无法加载角色配置') {
      return res.status(500).json({ 
        error: 'Failed to load character configurations from remote source' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process image',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// 工具函数 - 通过图片URL匹配角色配置
function getCharacterConfigByImageUrl(imageUrl: string, characterId: string | string[] | undefined, configs: any): any {
  // 如果提供了characterId，优先使用
  if (characterId) {
    const config = getCharacterConfigById(characterId, configs);
    if (config) return config;
  }

  // 从URL中提取图片路径
  const imagePath = extractImagePathFromUrl(imageUrl);

  // 1. 精确匹配提取的路径（如 Tairitsu/tairitsu2.png）
  const exactMatch = configs.find((char: any) => char.img === imagePath);
  if (exactMatch) {
    console.log(`Matched character (exact): ${exactMatch.name} for image: ${imagePath}`);
    return exactMatch;
  }

  // 2. 匹配URL路径名是否以 char.img 结尾（避免包含匹配导致 tairitsu.png 误匹配 tairitsu2.png）
  try {
    const urlStr = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    const urlObj = new URL(urlStr);
    const pathMatch = configs.find((char: any) => urlObj.pathname.endsWith(char.img));
    if (pathMatch) {
      console.log(`Matched character (path): ${pathMatch.name} for image: ${imagePath}`);
      return pathMatch;
    }
  } catch (e) {
    // ignore URL parse errors
  }

  // 3. 回退：按最长的 img 路径优先做子串匹配
  const sortedFallback = [...configs].sort((a, b) => b.img.length - a.img.length);
  const matchByUrl = sortedFallback.find((char: any) => imageUrl.includes(char.img));
  if (matchByUrl) {
    console.log(`Matched character (fallback): ${matchByUrl.name} for image: ${imagePath}`);
    return matchByUrl;
  }

  console.log(`No character match found for image: ${imagePath}, using default`);
  return defaultConfig.defaultCharacter;
}

function getCharacterConfigById(characterId: string | string[], configs: any): any {
  // 先按ID查找
  let config = configs.find((char: any) => char.id === characterId);
  if (config) return config;

  // 按名称查找
  config = configs.find((char: any) => char.name === characterId);
  if (config) return config;

  // 按角色字段查找
  config = configs.find((char: any) => char.character === characterId);
  if (config) return config;

  return null;
}

function extractImagePathFromUrl(url: string): string {
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

function processText(inputText: string): string {
  // 支持多种换行符格式：\\n, \n, /+/ 
  return inputText
    .replace(/\/+/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');
}

function buildFontStack(primaryFont: string): string {
  const ordered = [primaryFont, 'SSFangTangTi', 'YurukaStd', 'sans-serif'];
  return ordered
    .filter((font, index) => ordered.indexOf(font) === index)
    .map((font) => {
      if (font === 'sans-serif' || font === 'serif' || font === 'monospace') {
        return font;
      }
      return `"${font}"`;
    })
    .join(', ');
}

function createFontDeclaration(fontSize: number, fontStack: string): string {
  return `${fontSize}px ${fontStack}`;
}

function calculateOffsets(lines: string[], fontSize: number, fontStack: string, canvasWidth: number): { x: number; y: number } {
  if (!lines.length) {
    return { x: 0, y: 0 };
  }

  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = createFontDeclaration(fontSize, fontStack);
  const longestWidth = Math.max(...lines.map((line) => tempCtx.measureText(line).width));

  if (longestWidth > canvasWidth * 0.9) {
    return {
      x: -longestWidth * 0.05,
      y: 0
    };
  }

  return { x: 0, y: 0 };
}

function fitFontSizeToCanvas(
  lines: string[],
  baseFontSize: number,
  canvasWidth: number,
  canvasHeight: number,
  fontStack: string
): { fontSize: number; lineSpacing: number } {
  if (!lines.length) {
    const defaultSize = Math.max(16, Math.floor(baseFontSize));
    return {
      fontSize: defaultSize,
      lineSpacing: calculateAdaptiveSpaceSize(defaultSize, 1)
    };
  }

  const maxWidth = canvasWidth * 0.88;
  const maxHeight = canvasHeight * 0.7;
  const minFontSize = Math.max(12, Math.floor(baseFontSize * 0.4));
  let fontSize = Math.min(baseFontSize, Math.floor(canvasWidth));

  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext('2d');

  const fits = (size: number) => {
    tempCtx.font = createFontDeclaration(size, fontStack);
    const spacing = calculateAdaptiveSpaceSize(size, lines.length);
    const totalHeight = size + (lines.length - 1) * spacing;

    if (totalHeight > maxHeight) {
      return false;
    }

    return lines.every((line) => tempCtx.measureText(line).width <= maxWidth);
  };

  while (fontSize > minFontSize && !fits(fontSize)) {
    fontSize -= 1;
  }

  if (fontSize < minFontSize) {
    fontSize = minFontSize;
  }

  return {
    fontSize,
    lineSpacing: calculateAdaptiveSpaceSize(fontSize, lines.length)
  };
}

function calculateAdaptiveSpaceSize(fontSize: number, lineCount: number): number {
  if (lineCount <= 1) {
    return fontSize;
  }

  const baseSpacing = fontSize * 1.2;
  const compressionFactor = lineCount > 3 ? 3 / lineCount : 1;
  return Math.max(fontSize * 0.8, baseSpacing * compressionFactor);
}

export const config = {
  api: {
    responseLimit: '10mb',
    bodyParser: false,
  },
};

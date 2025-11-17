import { GlobalFonts } from '@napi-rs/canvas';

export default function handler(req, res) {
  const fontFamilies = GlobalFonts.families;
  
  res.status(200).json({
    fonts: fontFamilies,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

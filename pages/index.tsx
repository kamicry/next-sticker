import { useState } from 'react';

export default function RemoteImageOverlay() {
  const [imageUrl, setImageUrl] = useState('');
  const [text, setText] = useState('');
  const [font, setFont] = useState('YurukaStd');
  const [disableAdaptive, setDisableAdaptive] = useState(false);
  const [resultImage, setResultImage] = useState('');
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    if (!imageUrl || !text) {
      alert('请填写图片URL和文本');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        path: imageUrl,
        key: text,
        font: font,
        disableAdaptiveFunctionality: disableAdaptive.toString()
      });
      
      const url = `/api/overlay-text?${params}`;
      setResultImage(url);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('生成图片时出错: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>远程图片文字叠加工具</h1>
      
      <div style={{ marginBottom: '15px' }}>
        <label>图片URL: </label>
        <input 
          type="text" 
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="例如: https://raw.githubusercontent.com/lgc-NB2Dev/meme-stickers-hub/main/pjsk/airi/Airi_01.png"
          style={{ width: '100%', marginTop: '5px', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>输入文本: </label>
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', height: '80px', marginTop: '5px', padding: '8px' }}
          placeholder="支持多行文本，使用\\n换行"
        />
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <label>字体: </label>
          <select 
            value={font} 
            onChange={(e) => setFont(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="YurukaStd">YurukaStd</option>
            <option value="SSFangTangTi">SSFangTangTi</option>
            <option value="MicrosoftYaHei">Microsoft YaHei</option>
          </select>
        </div>
        
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={disableAdaptive}
              onChange={(e) => setDisableAdaptive(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            禁用文字自适应
          </label>
        </div>
      </div>

      <button 
        onClick={generateImage} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '生成中...' : '生成图片'}
      </button>

      {resultImage && (
        <div style={{ marginTop: '30px' }}>
          <h3>生成结果:</h3>
          <img 
            src={resultImage} 
            alt="处理后的图片" 
            style={{ 
              maxWidth: '100%', 
              border: '1px solid #ddd',
              borderRadius: '5px'
            }} 
          />
          <div style={{ marginTop: '10px' }}>
            <a 
              href={resultImage} 
              download="processed-image.png"
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '5px'
              }}
            >
              下载图片
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

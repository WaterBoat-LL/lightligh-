// Vercel Serverless Function - 文件上传代理
// 将文件转发到百度 AppBuilder，返回 file_id

const APP_ID = process.env.APPBUILDER_APP_ID || 'c22d3b92-c974-4c53-9a73-a51c69c8ea83';
const API_KEY = process.env.APPBUILDER_API_KEY || '';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'APPBUILDER_API_KEY 未配置' });
  }

  // 前端以 JSON 发送 base64 文件数据
  const { fileName, fileData, mimeType, conversation_id } = req.body || {};
  if (!fileName || !fileData || !conversation_id) {
    return res.status(400).json({ error: '缺少 fileName / fileData / conversation_id' });
  }

  try {
    // base64 → Buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // 构造 multipart/form-data
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const parts = [];
    const addField = (name, value) => {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
    };
    const addFile = (name, filename, type, data) => {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`
      );
      parts.push(data);
      parts.push('\r\n');
    };

    addField('app_id', APP_ID);
    addField('conversation_id', conversation_id);
    addFile('file', fileName, mimeType || 'application/octet-stream', fileBuffer);
    parts.push(`--${boundary}--\r\n`);

    const body = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
    const bodyBuffer = Buffer.concat(body);

    const upstream = await fetch('https://qianfan.baidubce.com/v2/app/conversation/file/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: bodyBuffer,
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.message || '上传失败', detail: data });
    }

    return res.status(200).json({ file_id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

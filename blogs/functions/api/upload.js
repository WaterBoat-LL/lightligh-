// Cloudflare Pages Function - 文件上传代理
// 将文件转发到百度 AppBuilder，返回 file_id

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const APP_ID = env.APPBUILDER_APP_ID || 'c22d3b92-c974-4c53-9a73-a51c69c8ea83';
  const API_KEY = env.APPBUILDER_API_KEY || '';

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'APPBUILDER_API_KEY 未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '无效的 JSON 请求体' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { fileName, fileData, mimeType, conversation_id } = body;
  if (!fileName || !fileData || !conversation_id) {
    return new Response(JSON.stringify({ error: '缺少 fileName / fileData / conversation_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // base64 → Uint8Array
    const binaryStr = atob(fileData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // 构造 multipart/form-data
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const parts = [];

    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="app_id"\r\n\r\n${APP_ID}\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="conversation_id"\r\n\r\n${conversation_id}\r\n`);
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
    );

    // 合并所有部分
    const textParts = parts.join('');
    const textEncoder = new TextEncoder();
    const textBytes = textEncoder.encode(textParts);
    const endBytes = textEncoder.encode(`\r\n--${boundary}--\r\n`);

    const totalLength = textBytes.length + bytes.length + endBytes.length;
    const result = new Uint8Array(totalLength);
    result.set(textBytes, 0);
    result.set(bytes, textBytes.length);
    result.set(endBytes, textBytes.length + bytes.length);

    const upstream = await fetch('https://qianfan.baidubce.com/v2/app/conversation/file/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: result,
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: data.message || '上传失败', detail: data }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ file_id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Vercel Serverless Function - 百度智能体 AppBuilder 流式对话
// 接口文档: https://ai.baidu.com/ai-doc/AppBuilder/mlv2fvh79

const APP_ID = process.env.APPBUILDER_APP_ID || 'c22d3b92-c974-4c53-9a73-a51c69c8ea83';
const API_KEY = process.env.APPBUILDER_API_KEY || '';

async function createConversation() {
  const resp = await fetch('https://qianfan.baidubce.com/v2/app/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ app_id: APP_ID }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.conversation_id) {
    throw new Error('创建会话失败: ' + JSON.stringify(data));
  }
  return data.conversation_id;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, conversation_id: inputConvId, file_ids } = req.body || {};
  if (!messages || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: '缺少 messages 参数' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'APPBUILDER_API_KEY 未配置' });
  }

  // 取最后一条用户消息作为 query
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) {
    return res.status(400).json({ error: '缺少用户消息' });
  }

  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    // 创建或复用 conversation_id
    let conversationId = inputConvId;
    if (!conversationId) {
      conversationId = await createConversation();
    }

    // 调用 runs 接口发送消息
    const reqBody = {
      app_id: APP_ID,
      query: lastUserMsg.content,
      stream: true,
      conversation_id: conversationId,
    };
    if (file_ids && file_ids.length) {
      reqBody.file_ids = file_ids;
    }

    const upstream = await fetch('https://qianfan.baidubce.com/v2/app/conversation/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      res.write(`data: ${JSON.stringify({ error: `API 错误 (${upstream.status}): ${err}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // 返回 conversation_id 给前端保存
    res.write(`data: ${JSON.stringify({ conversation_id: conversationId })}\n\n`);

    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const s = line.trim();
        if (!s || !s.startsWith('data: ')) continue;
        const data = s.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.answer) {
            res.write(`data: ${JSON.stringify({ content: parsed.answer })}\n\n`);
          }
        } catch { /* skip */ }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

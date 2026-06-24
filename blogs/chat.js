// Cloudflare Pages Function - 百度智能体 AppBuilder 流式对话
// 接口文档: https://ai.baidu.com/ai-doc/AppBuilder/mlv2fvh79

function createConversation(appId, apiKey) {
  return fetch('https://qianfan.baidubce.com/v2/app/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ app_id: appId }),
  }).then(r => r.json());
}

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

  const { messages, conversation_id: inputConvId, file_ids } = body;
  if (!messages || !Array.isArray(messages) || !messages.length) {
    return new Response(JSON.stringify({ error: '缺少 messages 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) {
    return new Response(JSON.stringify({ error: '缺少用户消息' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const enqueueSSE = (controller, data) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let conversationId = inputConvId;
        if (!conversationId) {
          const convData = await createConversation(APP_ID, API_KEY);
          if (!convData.conversation_id) {
            enqueueSSE(controller, { error: '创建会话失败: ' + JSON.stringify(convData) });
            enqueueSSE(controller, '[DONE]');
            return;
          }
          conversationId = convData.conversation_id;
        }

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
          enqueueSSE(controller, { error: `API 错误 (${upstream.status}): ${err}` });
          enqueueSSE(controller, '[DONE]');
          return;
        }

        enqueueSSE(controller, { conversation_id: conversationId });

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
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
                enqueueSSE(controller, { content: parsed.answer });
              }
            } catch { /* skip */ }
          }
        }

        enqueueSSE(controller, '[DONE]');
      } catch (e) {
        enqueueSSE(controller, { error: e.message });
        enqueueSSE(controller, '[DONE]');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

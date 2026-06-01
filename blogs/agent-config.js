// Vercel Serverless Function - 百度智能体配置代理
// API key 只存在于服务端环境变量中，不会暴露给前端

module.exports = function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 设置 CORS 头（仅允许同源访问）
  res.setHeader('Cache-Control', 'no-store');

  const appId = process.env.BAIDU_AGENT_APP_ID;
  const code = process.env.BAIDU_AGENT_CODE;

  if (!appId || !code) {
    return res.status(500).json({ error: 'Agent config not set on server' });
  }

  // 返回前端需要的配置
  return res.status(200).json({
    appId,
    code,
    sdkUrl: 'https://agi-dev-platform-web.cdn.bcebos.com/ai_apaas/embed/output/embedFullSDK.js?responseExpires=0&t=1779503604078'
  });
};

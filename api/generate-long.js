import { jsonResponse } from './_openai.js';

export default function handler(request, response) {
  return jsonResponse(response, 410, { error: '問題生成は終了しました。固定問題バンクを利用してください。' });
}

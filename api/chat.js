const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== 사용량 제한 =====
const usageMap = new Map();
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || '300', 10);

function checkRateLimit(ip) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${ip}_${today}`;
    const count = usageMap.get(key) || 0;
    if (count >= DAILY_LIMIT) return false;
    usageMap.set(key, count + 1);
    return true;
}

// ===== 시스템 프롬프트 =====
const SYSTEM_PROMPT = `당신은 "성경 도우미" AI입니다. 한국어로 성경에 대한 질문에 답변합니다.

## 답변 규칙
1. 답변은 반드시 한국어로 작성합니다.
2. 답변은 정확한 성경적 사실에 기반해야 합니다.
3. 답변 끝에 반드시 관련 성경 구절을 제공합니다.
4. 답변 끝에 반드시 연관 질문 2개를 제안합니다.
5. 어르신이 읽기 쉽도록 간결하고 명확하게 작성합니다.

## 에이전트 역할
질문 유형에 따라 적절한 전문가 역할을 수행합니다:
- 인물/역사 관련 → "역사 전문가" (아이콘: 📚)
- 이야기/사건 관련 → "이야기 전문가" (아이콘: 📖)
- 특정 구절 관련 → "구절 해석" (아이콘: 📜)
- 신학/교리 관련 → "신학 전문가" (아이콘: ✝️)
- 기타 → "안내" (아이콘: 🤖)

## 응답 규칙
반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 절대 포함하지 마세요.
{
  "agentName": "에이전트 이름",
  "agentIcon": "이모지 아이콘",
  "content": "HTML 형식의 답변 본문. 줄바꿈은 <br> 태그, 강조는 <strong> 태그를 사용",
  "references": [
    {"verse": "성경 구절 위치 예) 창세기 1:1", "text": "해당 구절 본문 텍스트"}
  ],
  "related": [
    "연관 질문 1",
    "연관 질문 2"
  ]
}`;

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    // API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === '여기에_API키를_입력하세요') {
        return res.status(500).json({
            error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. Vercel 대시보드 → Settings → Environment Variables에서 설정해주세요.',
            fallback: true
        });
    }

    // 사용량 제한
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: '오늘 사용량을 다 썼습니다. 내일 다시 시도해주세요.',
            fallback: true
        });
    }

    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: '질문을 입력해주세요.' });
        }

        // Gemini API 호출
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite-preview-06-17',
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 2048,
            },
        });

        // 대화 히스토리 구성
        const chatHistory = (history || []).map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
        }));

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);
        const text = result.response.text();

        // JSON 파싱
        let parsed;
        try {
            // ```json ... ``` 블록에서 추출 시도
            const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
            parsed = JSON.parse(jsonStr);
        } catch {
            // JSON 파싱 실패 시 텍스트에서 JSON 부분 추출 시도
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch {
                    parsed = {
                        agentName: '안내',
                        agentIcon: '🤖',
                        content: text.replace(/\n/g, '<br>'),
                        references: [],
                        related: [],
                    };
                }
            } else {
                parsed = {
                    agentName: '안내',
                    agentIcon: '🤖',
                    content: text.replace(/\n/g, '<br>'),
                    references: [],
                    related: [],
                };
            }
        }

        return res.status(200).json(parsed);
    } catch (err) {
        console.error('Gemini API Error:', err.message || err);
        return res.status(500).json({
            error: `API 오류: ${err.message || '알 수 없는 오류'}`,
            fallback: true
        });
    }
};

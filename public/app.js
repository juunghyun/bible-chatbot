// ========================================
//  성경 도우미 — 실서비스 에디션
// ========================================

const chatArea = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// 대화 히스토리 (컨텍스트 유지)
let chatHistory = [];

// ===== 입력 높이 자동 조절 =====
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
});

// ===== 전송 =====
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function quickAsk(text) {
    chatInput.value = text;
    sendMessage();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // 웰컴 카드 제거
    const welcome = document.querySelector('.welcome-card');
    if (welcome) {
        welcome.style.animation = 'card-out 0.3s var(--ease-out) forwards';
        setTimeout(() => welcome.remove(), 300);
    }

    appendUserMessage(text);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // 히스토리에 사용자 메시지 추가
    chatHistory.push({ role: 'user', content: text });

    showTyping();

    try {
        const resp = await callAPI(text);
        removeTyping();
        appendBotMessage(resp);

        // 히스토리에 봇 응답 추가 (최근 10개만 유지)
        chatHistory.push({ role: 'assistant', content: resp.content });
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }
    } catch (err) {
        removeTyping();
        // API 실패 시 폴백 응답
        const fallback = getFallbackResponse(text);
        appendBotMessage(fallback);
    }

    sendBtn.disabled = false;
}

// ===== API 호출 (자동 재시도 포함) =====
async function callAPI(message, retries = 2) {
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            history: chatHistory.slice(-10)
        }),
    });

    const data = await res.json().catch(() => null);

    // 429(Too Many Requests) 또는 503(서버 과부하) → 자동 재시도
    if ((res.status === 429 || res.status === 503 || (data?.error && data.error.includes('high demand'))) && retries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        return callAPI(message, retries - 1);
    }

    if (!res.ok || !data) {
        const errorMsg = data?.error || `서버 응답 오류 (${res.status})`;
        return {
            agentName: '시스템',
            agentIcon: '⚠️',
            content: `<strong>오류가 발생했습니다</strong><br><br>${errorMsg}<br><br>잠시 후 다시 시도해주세요.`,
            references: [],
            related: [],
            _fallback: true
        };
    }

    return data;
}

// ===== 카드 퇴장 애니메이션 =====
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
@keyframes card-out {
    to { opacity:0; transform:translateY(-10px) scale(0.96); }
}`;
document.head.appendChild(fadeOutStyle);

// ===== 사용자 메시지 =====
function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'message user-message';
    el.innerHTML = `<div class="message-bubble">${escapeHTML(text)}</div>`;
    chatArea.appendChild(el);
    scrollBottom();
}

// ===== 봇 메시지 =====
function appendBotMessage(resp) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message bot-message';

    // 에이전트 태그
    wrapper.innerHTML = `
        <div class="agent-tag">
            <span class="dot"></span>
            ${resp.agentIcon || '🤖'} ${resp.agentName || '안내'}
        </div>
    `;

    // 본문 버블
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = resp.content || '';

    // 성경 출처 (접기/펼치기)
    if (resp.references?.length) {
        const sec = document.createElement('div');
        sec.className = 'ref-section';

        const toggle = document.createElement('button');
        toggle.className = 'ref-toggle';
        toggle.innerHTML = `📖 성경 구절 ${resp.references.length}개 <span class="chevron">▾</span>`;

        const list = document.createElement('div');
        list.className = 'ref-list';
        resp.references.forEach(r => {
            list.innerHTML += `
                <div class="ref-card">
                    <div class="ref-verse">${r.verse}</div>
                    <div class="ref-text">${r.text}</div>
                </div>`;
        });

        toggle.addEventListener('click', () => {
            toggle.classList.toggle('open');
            list.classList.toggle('open');
        });

        sec.appendChild(toggle);
        sec.appendChild(list);
        bubble.appendChild(sec);
    }

    wrapper.appendChild(bubble);

    // 연관 질문
    if (resp.related?.length) {
        const rel = document.createElement('div');
        rel.className = 'related-section';
        rel.innerHTML = `<span class="related-label">💡 관련 질문</span>`;
        resp.related.forEach(q => {
            const chip = document.createElement('button');
            chip.className = 'related-chip';
            chip.innerHTML = `${q} <span class="arrow">→</span>`;
            chip.addEventListener('click', () => {
                chatInput.value = q;
                sendMessage();
            });
            rel.appendChild(chip);
        });
        wrapper.appendChild(rel);
    }

    chatArea.appendChild(wrapper);
    scrollBottom();
}

// ===== 타이핑 인디케이터 =====
function showTyping() {
    const el = document.createElement('div');
    el.className = 'message bot-message';
    el.id = 'typingIndicator';
    el.innerHTML = `
        <div class="agent-tag"><span class="dot"></span>응답 준비 중…</div>
        <div class="typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>`;
    chatArea.appendChild(el);
    scrollBottom();
}

function removeTyping() {
    document.getElementById('typingIndicator')?.remove();
}

function scrollBottom() {
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ===== 폴백 응답 (API 키 미설정 또는 오류 시) =====
function getFallbackResponse(msg) {
    const m = msg.toLowerCase();

    if (m.includes('아몬')) {
        return {
            agentName: '역사 전문가',
            agentIcon: '📚',
            content: `<strong>아몬 왕</strong><br><br>
                아몬은 유다의 제16대 왕으로 <strong>BC 642‑640년</strong>에 통치했습니다.<br><br>
                아몬은 므낫세의 아들로, 22세에 왕이 되어 2년간 통치했습니다.
                그는 아버지 므낫세처럼 악을 행했고, 신하들의 반역으로 궁에서 살해당했습니다.<br><br>
                <strong>관련 인물</strong> — 므낫세(아버지) · 요시야(아들)`,
            references: [
                { verse: '열왕기하 21:19‑20', text: '아몬이 왕이 될 때에 나이가 이십이 세라 예루살렘에서 이 년간 다스리니라 … 여호와 보시기에 악을 행하여' },
                { verse: '열왕기하 21:23‑24', text: '아몬의 신하들이 반역하여 왕을 궁중에서 죽이매 그 땅 백성이 … 그의 아들 요시야를 대신하여 왕으로 삼았더라' },
            ],
            related: ['므낫세 왕은 어떤 사람이었나요?', '요시야 왕의 업적을 알려주세요']
        };
    }

    if (m.includes('다윗') || m.includes('골리앗')) {
        return {
            agentName: '이야기 전문가',
            agentIcon: '📖',
            content: `<strong>다윗과 골리앗</strong><br><br>
                이스라엘의 목동 소년 다윗이 블레셋의 거인 골리앗을 물매로 쓰러뜨린 유명한 이야기입니다.<br><br>
                골리앗은 키가 약 3미터에 달하는 거인 전사였습니다.
                다윗은 하나님을 신뢰하며 물매와 돌 다섯 개만으로 골리앗에게 맞섰습니다.<br><br>
                <em>"나는 만군의 여호와의 이름으로 네게 나아가노라"</em>`,
            references: [
                { verse: '사무엘상 17:45', text: '"너는 칼과 창과 단창으로 내게 나아오거니와 나는 만군의 여호와의 이름으로 네게 나아가노라"' },
                { verse: '사무엘상 17:49', text: '다윗이 손을 주머니에 넣어 돌을 가지고 물매로 던져 블레셋 사람의 이마를 치매' },
            ],
            related: ['다윗은 어떻게 왕이 되었나요?', '다윗과 사울의 관계는 어땠나요?']
        };
    }

    if (m.includes('요한') && (m.includes('3') || m.includes('16'))) {
        return {
            agentName: '구절 해석',
            agentIcon: '📜',
            content: `<strong>요한복음 3장 16절</strong><br><br>
                <em>"하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니
                이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라"</em><br><br>
                성경에서 가장 유명한 구절 중 하나로, 하나님의 사랑과 구원의 핵심 메시지를 담고 있습니다.`,
            references: [
                { verse: '요한복음 3:16', text: '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라' },
                { verse: '요한복음 3:17', text: '하나님이 그 아들을 세상에 보내신 것은 세상을 심판하려 하심이 아니요 그로 말미암아 세상이 구원을 받게 하려 하심이라' },
            ],
            related: ['니고데모는 누구인가요?', '요한복음의 핵심 메시지는 무엇인가요?']
        };
    }

    return {
        agentName: '안내',
        agentIcon: '🤖',
        content: `현재 AI 서버에 연결할 수 없어 제한된 답변만 가능합니다. 😅<br><br>
            <strong>테스트 가능한 질문:</strong><br>
            • 아몬에 대해 알려주세요<br>
            • 다윗과 골리앗 이야기<br>
            • 요한복음 3장 16절`,
        references: [],
        related: ['아몬은 언제 왕이었나요?', '다윗과 골리앗 이야기를 알려주세요']
    };
}

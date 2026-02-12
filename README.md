# 📖 성경 도우미 AI 챗봇

어머님을 위한 성경 검색 및 AI 챗봇 서비스입니다.

## ✨ 기능
- 💬 **AI 챗봇**: 성경에 대한 모든 질문에 AI가 답변
- 📚 **전문가 에이전트**: 질문 유형별 최적 AI 에이전트 자동 선택
- 📖 **성경 구절 출처**: 답변의 근거 성경 구절을 접었다 펼칠 수 있는 형태로 제공
- 💡 **연관 질문 추천**: 답변 후 관련 질문 2개 자동 제시
- 📱 **모바일 최적화**: 큰 글씨, 간단한 UI, 홈 화면 추가 가능

## 🚀 배포 방법

### 1. Gemini API 키 발급
1. [Google AI Studio](https://aistudio.google.com) 접속
2. 로그인 → "Get API Key" → "Create API Key"
3. 발급된 키를 복사

### 2. GitHub에 업로드
```bash
git init
git add .
git commit -m "성경 도우미 초기 버전"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bible-chatbot.git
git push -u origin main
```

### 3. Vercel 배포
1. [vercel.com](https://vercel.com) 에서 GitHub 계정으로 로그인
2. "Add New" → "Project" → GitHub 저장소 선택
3. **Environment Variables** 설정:
   - `GEMINI_API_KEY` = (발급받은 API 키)
   - `DAILY_LIMIT` = `300`
4. "Deploy" 클릭

### 4. 완료!
배포 후 `https://your-project.vercel.app` 으로 접속 가능

## 🛠 로컬 개발

```bash
# 의존성 설치
npm install

# .env 파일 생성
cp .env.example .env
# .env 파일에 API 키 입력

# 로컬 서버 실행
npx vercel dev
```

## 📁 프로젝트 구조
```
bible-chatbot/
├── api/
│   └── chat.js          # Gemini API 서버리스 함수
├── public/
│   ├── index.html       # 메인 페이지
│   ├── styles.css       # 리퀴드 글래스 디자인
│   └── app.js           # 프론트엔드 로직
├── package.json
├── vercel.json          # Vercel 배포 설정
├── .env.example         # 환경 변수 템플릿
└── .gitignore
```

## 💰 비용
- **AI API**: 무료 (Gemini 무료 티어)
- **호스팅**: 무료 (Vercel Hobby 플랜)
- **총 비용**: 0원

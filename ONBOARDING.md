# DreamBoard — 인계 / 이어서 작업 가이드

> 컨텍스트 클리어 후 작업 재개 시 이 문서 먼저 읽기. 작업 중간에 멈춰서 **미완료 사항이 핵심**.

---

## 📌 프로젝트 한줄 요약

개인 목표·드림·자산을 RPG 게임화한 단일 사용자 웹 대시보드. 사용자=시뮬레이션 캐릭터, 목표=퀘스트, 드림=인생 비전.

- **사용자**: timpark1033@gmail.com (부동산 사업가 + 유튜버 + NoteUp 창업자)
- **배포 URL**: jinboard.pages.dev (Cloudflare Pages)
- **저장소**: github.com/timpark1033/jinboard (`master` push → `main` deploy)
- **현재 브랜치**: master

---

## 🗂️ 파일 구조

```
C:\Users\sj\Desktop\jinboard\
├── index.html           (~50줄, HTML 셸 + Firebase 초기화 + 캐시버스터 ?v=)
├── styles.css           (~4500줄)
├── app.js               (~4270줄, 모든 React 코드)
└── ONBOARDING.md        ← 이 문서
```

모킹/디자인 검토용:
```
C:\Users\sj\Downloads\jinboard.html  (대시보드 컨셉 A/B/C 비교 목업)
```

### 캐시 버스터 (중요)
배포 후 브라우저가 옛 `app.js`/`styles.css`를 캐시함. **변경할 때마다** `index.html`의 `?v=YYYYMMDDx` 끝 글자(`x`)를 다음 알파벳으로 bump해야 사용자 새로고침 시 새 코드 로드. 현재 값: `?v=20260521ad`.

---

## 🛠️ 기술 스택

- **React 18 + Babel standalone** (CDN, 빌드 단계 없음 — `<script type="text/babel">`로 JSX 직접 실행)
- **Firebase**:
  - Auth: Google Sign-In, 단일 이메일 화이트리스트 (`ALLOWED_EMAIL` 상수)
  - Firestore: 사용자당 단일 문서 `users/{uid}` — **1MB 제한 ← 핵심 제약**
- **CSS**: variable 기반 다크 테마, vanilla CSS (Tailwind 등 안 씀)
- **차트**: SVG 핸드롤 (Chart.js 등 안 씀)
- **이미지**: 현재 base64 dataURL로 Firestore에 직접 저장 (1MB 한계로 압축 강제 → 화질 저하)

---

## 🎯 현재 구조 (탭 4개)

1. **대시보드** ← 최근 B 컨셉으로 전면 개편 (Part 1만 완료)
2. **목표·업무** (목표 CRUD + 퀘스트 + 4분면 업무 + 회고 통합)
3. **자원·아이템** (재무관리 + 디아블로 인벤토리)
4. **비전·드림** (드림 보드 + 캐릭터 스탯 + 큰 계획 타임라인)

---

## ✅ 최근까지 완료된 주요 기능

### RPG 시스템
- 6개 스탯 (유튜브/부동산/개발/영어/건강/재정), 10레벨 만렙, totalXp 누적
- 종합 레벨 = 6 스탯 레벨 합, 만렙 60
- 할일 완료 → 연결 스탯 XP 자동 부여 + 스트릭 보너스 (+10%/+25%)
- 단계(메인) 완료 → +150 XP, 전체 단계 완료 → +600 XP 보너스

### 퀘스트 시스템 (사이드+도전 통합)
- `goal.quests[]`: `{ name, current, target, xpReward, xpPerStep, repeat, done }`
- 카운터 기반 (`current/target`, e.g. "역사 롱폼 10/10")
- 할일에 `questId` 연결 → 할일 완료 시 자동 +1 / 해제 시 -1
- 매주 반복 (`repeat:"weekly"`): 월요일 자동 리셋, 미완료 시 50% XP 차감
- 마이그레이션 로직 있음 (`migrateGoalQuests`): 옛 `sideQuests`/`challenges` → `quests`

### 목표 카드
- 메인 단계 (선형, 순서 강제, +150 XP) + 퀘스트 (자유, 카운터)
- 마감일 + 대시보드 D-day 뱃지 (D-3 빨강, D-7 앰버)
- 드래그앤드롭 순서 변경 (대시보드도 자동 반영)
- 인라인 todo 스타일 추가 (각 섹션 하단 입력)
- 한글 어절 단위 줄바꿈 (이름 잘림 방지)

### 드림
- 4단계 티어 (Legend 5000XP / Epic 2500 / Rare 1000 / Normal 400)
- 이미지: 파일 업로드 (canvas 압축) + Gemini AI 생성 (나노바나나 2)
- 뷰/편집 모드 분리 (수정 → 완료 → 삭제 확인 모달)
- 가로 자동 롤링 캐러셀 (호버 시 정지)

### 재무·아이템
- 자산 인라인 CRUD (부동산/계좌/기타)
- FinanceDetailModal (수입/지출 상세 관리)
- 디아블로 8×4 인벤토리, ItemDetailModal (버프/디버프 자동 자원 합산)

### 회고
- 1주 1개 정책, 이번주 회고 자동 로드 (수정 모드)
- 주차 + 날짜 범위 표시 (`W21 (05.18 ~ 05.24)`)

### 집중 모드
- 풀스크린, 텍스트 4x 크기, 포모도로 25분
- `이전 / 시작 / 완료 / 초기화 / 다음` 5버튼
- 명시적 ☑ 완료 클릭만 dot 색칠

### 설정
- Gemini API Key + 텍스트/이미지 모델 드롭다운
- 죽은 모델 자동 마이그레이션 (예: `gemini-2.5-flash-image-preview` 셧다운됨)
- 추천: 텍스트 `gemini-3.5-flash`, 이미지 `gemini-3.1-flash-image-preview` (나노바나나 2)
- ⚠️ **이미지 생성은 유료** (Tier 1 결제 필요 — Google의 free tier limit=0 정책)

### 저장 상태
- Firestore 저장 1.5초 debounce
- 좌측 하단 인디케이터: 저장중/저장됨/에러
- 1MB 초과 시 에러 + 🔧 강제 재압축 버튼 (640×400 q0.6)

---

## 🚧 미완료 / 진행 중 작업 (우선순위 순)

### 🔴 1. 우클릭 컨텍스트 메뉴 버그 (HIGHEST — 사용자 신고 직전)
**증상**: 대시보드 KPI 카드 우클릭 → 컨텍스트 메뉴가 뜨자마자 즉시 닫힘 (혹은 클릭이 안 먹힘)

**원인**: `app.js:487` 부근의 `document.addEventListener("click", close)` 가 모든 클릭에서 메뉴 닫음. React `e.stopPropagation()`이 네이티브 document 리스너까지는 못 막음.

**해결**: backdrop overlay 패턴으로 변경
```jsx
{ctxMenu && (
  <>
    <div onClick={() => setCtxMenu(null)} style={{ position:"fixed", inset:0, zIndex:9998 }} />
    <div className="db2-ctxmenu" style={{ position:"fixed", left:ctxMenu.x, top:ctxMenu.y, zIndex:9999 }}>
      ...
    </div>
  </>
)}
```
그리고 `useEffect` document listener 제거.

---

### 🟠 2. GoalDetailModal (대시보드 Part 2 — 핵심 미구현)
**상태**: 목표 클릭 시 `setGoalDetailId(gId)` 만 호출 (state는 있음), **모달 컴포넌트 자체가 없음**

**구현 필요**:
- `function GoalDetailModal({ open, onClose, goal, stats, ... }) { ... }` 신규 작성
- App에서 `<GoalDetailModal open={!!goalDetailId} ... />` 렌더링
- 풀스크린 모달, 큰 반원 게이지 + 단계 타임라인 + 퀘스트 도넛 + 통계 3-col
- 디자인은 `C:\Users\sj\Downloads\jinboard.html` 하단 "🔍 목표 세부 대시보드" 섹션 참고 (이미 목업 완성)

**관련 CSS**: 목업 파일의 `.dm-*` 클래스들 복붙하면 됨

---

### 🟠 3. SettingsModal에 인생 게이지용 입력 추가
**상태**: `INITIAL_SETTINGS`에 `birthDate, gender, expectedLifespan, retireAge` 필드는 추가됨. **UI 입력칸 없음** → 사용자가 못 입력 → 인생 게이지 항상 placeholder 표시.

**구현 필요**: `SettingsModal` 함수 내부에 새 섹션 추가
```jsx
<div className="settings-section">
  <div className="settings-section-title">📅 개인 정보</div>
  <div className="settings-field">
    <label>생년월일</label>
    <input type="date" value={settings.birthDate || ""} onChange={(e) => update("birthDate", e.target.value)} />
  </div>
  <div className="settings-field">
    <label>성별</label>
    <select value={settings.gender || "male"} onChange={(e) => {
      const g = e.target.value;
      update("gender", g);
      update("expectedLifespan", g === "female" ? 86.6 : 80.6);
    }}>
      <option value="male">남</option>
      <option value="female">여</option>
    </select>
  </div>
  <div className="settings-field">
    <label>예상 수명</label>
    <input type="number" step="0.1" value={settings.expectedLifespan || 80.6} onChange={(e) => update("expectedLifespan", Number(e.target.value))} />
  </div>
  <div className="settings-field">
    <label>은퇴 나이</label>
    <input type="number" value={settings.retireAge || 65} onChange={(e) => update("retireAge", Number(e.target.value))} />
  </div>
</div>
```

위치: 기존 "⏰ 시간·에너지" 섹션 다음에 삽입.

---

### 🟡 4. Firebase Storage 마이그레이션 (이미지 화질 문제 해결)
**상태**: 사용자가 화질 저하 신고. 현재 base64 + 강제 압축으로 Firestore 1MB 한계 회피 중. **근본 해결 미적용.**

**계획 (사용자 컨펌 받음 — A안 진행 예정)**:
1. Firebase Console에서 Storage 활성화
2. `firebase-storage-compat.js` CDN 추가
3. `compressImage` / `geminiGenerateImage` 결과를 Storage에 업로드
4. 반환된 download URL을 `dream.imgUrl`에 저장 (지금처럼 base64 대신)
5. 기존 base64 이미지 마이그레이션 스크립트 (선택)

**예상 작업**: 30~40분, app.js + index.html

```html
<!-- index.html에 추가 -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>
```

```js
// app.js에 추가
const _storage = firebase.storage();

async function uploadDreamImage(dataUrl, dreamId) {
  const blob = await (await fetch(dataUrl)).blob();
  const ref = _storage.ref(`dreams/${user.uid}/${dreamId}_${Date.now()}.jpg`);
  await ref.put(blob);
  return await ref.getDownloadURL();
}
```

Storage 규칙도 설정 필요 (인증된 본인만 r/w).

---

### 🟡 5. 옛 코드 정리 — 미사용 함수/state
대시보드 B 컨셉 개편으로 다음이 쓸모 없어짐 (but 다른 곳에서 안 쓰는지 확인 후 제거):
- `weeklyGoals`, `nextWeekGoals`, `topThree`, `streak` UI (state 자체는 유지, 다른 곳에서 참조 가능)
- 옛 `db-root`, `db-side`, `db-zone3`, `db-zone4` CSS (지금은 unused but 정리 안 됨)
- `RingChart` 컴포넌트 (대시보드에서 안 씀, 다른 곳에서 쓰는지 확인)
- `qb-row`, `qb-quest`, `current-stage` 등 (대시보드 옛 퀘스트북용 CSS)

지금은 안 건드려도 동작 OK. 다음 refactor 라운드에서.

---

### 🟢 6. 마이너 개선 사항
- KPI 카드 우클릭 → "타입 변경 (자산 ↔ 수입)" 메뉴 동작 검증 필요
- 카드 추가 시 `+` 버튼이 4개 슬롯 채우면 사라짐 (의도된 동작 — 4 max)
- 인생 게이지에서 생년월일 미입력 시 안내 → "⚙ 설정 열기" 버튼이 statModal 여는 중 (settingsModal로 변경 필요)
  - **현재 코드 버그**: `onOpenStatModal={() => setSettingsOpen(true)}` 로 잘못 연결됨. 본래 stat modal과 settings modal은 따로. 확인 필요.
- 드림 가로 롤링 속도: `animationDuration: Math.max(20, dreams.length * 8) + "s"` — 드림 수에 비례. 너무 빠르면 조정.

---

## 📊 데이터 모델 핵심 요약

### Goal
```js
{
  id, name, category, deadline, progress, tier,  // basic
  statId,  // 연결 스탯 (XP 부여 대상)
  milestones: [{ id, name, status: "done"|"active"|"todo", deadline, xpReward }],  // 메인 단계
  quests: [{ id, name, current, target, unit, xpReward, xpPerStep, repeat, done, deadline, lastResetWeek }],  // 퀘스트
  // 옛 필드 (마이그레이션 후에도 유지될 수 있음)
  sideQuests: [...], challenges: [...]
}
```

### Task
```js
{ id, text, done, quadrant: 1-4, goalId, questId, tag, dueDate, time }
```

### Dream
```js
{ id, name, emoji, tier: "legend|epic|rare|normal", targetAmount, currentAmount, unit, imgUrl, calc: { monthlySavings, targetYears } }
```

### Stat
```js
{ id, icon, label, totalXp, desc, value, unit }  // totalXp 누적식, level은 계산
```

### Item
```js
{ id, name, emoji, status: "equipped|developing|stored", description, buffs: [...], debuffs: [...], goalId, devProgress, devTarget }
```

### Finance
```js
{
  assets: [{ id, category: "estate|account|other", name, value }],
  incomes: [{ id, category: "regular|irregular", name, expected, actual, day }],
  expenses: [{ id, category: "fixed|variable|oneoff", name, expected, actual, day }]
}
```

### SummaryCard (대시보드 KPI)
```js
{ id, icon, name, value, unit, type: "asset"|"income", target?, changePct? }
```

### Settings (localStorage `dreamboard_settings`)
```js
{
  geminiKey, geminiTextModel, geminiImageModel,
  weeklyTimePool, weeklyEnergyPool,
  birthDate, gender, expectedLifespan, retireAge
}
```

---

## 🔑 주요 헬퍼 함수 위치

| 함수 | 위치 (대략) | 용도 |
|------|------------|------|
| `calcDday(dateStr)` | app.js:4 | 마감일 D-day |
| `weekDday()` | app.js:10 | 이번주 D-day (월=D-6) |
| `calcLifeStats(birth, lifespan, retire)` | app.js:17 | 인생 통계 (age/remaining/golden) |
| `statLevel(totalXp)` | (early) | 누적 XP → 레벨 |
| `STAT_LEVEL_REQ` | (early) | 레벨별 필요 XP 배열 |
| `migrateGoalQuests(g)` | (early) | sideQuests+challenges → quests |
| `xpForTask(t)` | (early) | Q1=40, 나머지=15 |
| `streakBonus(streak)` | (early) | 3일+10%, 7일+25% |
| `resolveStatId(task, goals)` | (early) | 할일의 연결 스탯 ID |
| `compressImage(file, w, h, q)` | (middle) | 파일 → base64 JPEG |
| `compressDataUrl(url, w, h, q)` | (middle) | data URL 재압축 |
| `geminiSuggestTask(key, text)` | (middle) | AI 할일 추정 |
| `geminiGenerateImage(key, prompt)` | (middle) | 나노바나나 이미지 생성 |
| `fmtKR(n)` | (middle) | 한국어 통화 (억/만) |
| `fmtManwon(n)` | (middle) | 만원 단위 → "1억 1,000만원" |

---

## 🔧 개발 워크플로우

### 변경 후 배포
```bash
cd /c/Users/sj/Desktop/jinboard
# 1. styles.css / app.js 수정
# 2. index.html의 ?v=20260521xx 끝 글자 bump (필수!)
# 3. 커밋 + 푸시
git add -A && git commit -m "..." && git push origin master:main
# 4. Cloudflare 자동 배포 1~2분
# 5. 사용자에게 Ctrl+Shift+R 안내
```

### CSS 추가 패턴
큰 CSS는 별도 stage 파일에 작성 후 append:
```bash
cat stageNN.css >> styles.css && rm stageNN.css
```

### Big component 교체 (Dashboard 등)
Python으로 라인 범위 정확히 자르기:
```python
with open('app.js','r',encoding='utf-8') as f: lines=f.readlines()
with open('new_component.jsx','r',encoding='utf-8') as f: new=f.read()
out = ''.join(lines[:START]) + new + ''.join(lines[END:])
with open('app.js','w',encoding='utf-8',newline='') as f: f.write(out)
```

---

## ⚠️ 주요 함정 / 알아둘 것

1. **이미지 화질 vs 1MB**: AI 생성 PNG가 200~500KB. 5개 모이면 1MB 초과. 현재는 강제 압축으로 대응 중 → Firebase Storage로 근본 해결 필요.

2. **나노바나나 (Gemini Image)는 유료 전용**: 무료 티어 limit=0. 사용자가 결제 활성화해야 함. 텍스트 모델 (gemini-3.5-flash 등)은 무료 가능.

3. **Tier 1 결제 + 이미지 모델 버그**: 결제했어도 free_tier limit=0 에러 발생하는 Google 측 버그 보고됨 (2026.02). 모델 바꿔보거나 AI Studio 웹UI 우회 안내됨.

4. **React `e.stopPropagation()` ≠ native event 차단**: document.addEventListener는 별도 처리 필요. backdrop 패턴 권장.

5. **Firestore 1MB 문서 제한**: 모든 사용자 데이터 (goals/tasks/dreams/items/finance/...) 가 단일 문서. **이미지 빼면** 보통 100~300KB. 문제는 이미지.

6. **localStorage settings**: API key 등 민감 정보. Firestore 안 들어감. 디바이스별로 다름.

7. **CSS class 충돌 주의**: 새 대시보드 `.big-ring`이 옛 VisionTab `.big-timeline` 같은 거랑 헷갈리지 않게. 옛 `.db-zone3` 등 unused CSS 남아있음.

---

## 📜 최근 커밋 흐름 (최신 → 과거)

```
73e9e66 feat: 대시보드 B 컨셉 전면 개편 (Part 1)              ← 가장 최근
bc5fab5 style: 완료 단계 사선 굵기 2px → 1.2px
da4696a style: 완료 단계 취소선 더 또렷하게
79e0c87 style: 단계/퀘스트 모달 행 — 날짜 컴팩트 + 이름 잘림 방지
3d92090 feat: 4분면 할일 ✏ 편집 버튼 + 세부 편집 모달
05ab2ea feat: 목표 카드 드래그앤드롭 순서 변경
e3affb4 feat: 단계/퀘스트 마감일 + 대시보드 D-day
99999f3 fix: 현재 단계 1개만 강조 + 완료/예정 밝은 회색
3fd877a fix: 1MB 초과 에러에 강제 재압축 원클릭 버튼
5f0286c feat: 사이드+도전 통합 퀘스트 + 카운터 + 1:1 연결
351fe5c feat: 대시보드 목표카드 2-col + 현재 단계 강조
0e09130 feat: 메인·사이드·도전 인라인 추가 (todo 스타일)
2f3f0c6 style: 드림 카드 이름 2줄 wrap
b16fc8c fix: 드림카드 음영 하단만 + Firestore 저장 에러 표시
79e2a1d style: 드림카드 하단 70% 검은 음영
788a1a3 feat: AI 생성 이미지 자동 JPEG 압축 (1MB 대응)
b5bf5ef feat: 드림 카드 뷰/편집 분리 + 저장·삭제 확인
9ecb8a9 feat: 드림 이미지 선명도 강화
6479c26 fix: 대시보드 Zone3 항상 3열 고정
```

---

## 🚀 작업 재개 시 첫 단계 (추천 순서)

1. **[5분]** 사용자에게 마지막 작업이 어디까지였는지 확인. ("우클릭 컨텍스트 메뉴 버그 잡는 중이었어요")
2. **[10분]** 우클릭 메뉴 버그 수정 (위 #1) → 푸시 → 확인
3. **[30분]** GoalDetailModal 구현 (위 #2) — 목업 디자인 그대로 옮기기
4. **[15분]** SettingsModal에 생년월일 입력 추가 (위 #3) → 인생 게이지 활성화
5. **[40분]** Firebase Storage 마이그레이션 (위 #4) — 사용자 컨펌 받았음

각 단계 후 cache buster bump + git push + Cloudflare 배포 대기 + 사용자 Ctrl+Shift+R 안내.

---

## 💬 사용자 톤 / 작업 스타일

- 한국어 사용자. 짧고 직설적인 한국어 응답 선호.
- 큰 변경 전에 **아이디어 회의 → 목업 → 컨펌 → 코드 반영** 순서 강력 선호. 코드부터 들이대지 말 것.
- 디자인을 매우 중시함. "세련된", "있어보이는", "게임 UI", "인포그래픽" 자주 언급.
- 사진/스크린샷으로 시각 피드백 자주 줌. 그것 기반으로 즉시 수정.
- TaskCreate/TaskList는 사용 안 함 (시스템 리마인더 있을 때만 가끔).
- 메모리 시스템도 거의 활용 안 됨.

---

**이 문서 = 단일 진실의 출처. 미완료 항목 처리 끝낼 때마다 위 "🚧 미완료" 섹션에서 제거하고 "✅ 완료" 섹션으로 옮기기.**

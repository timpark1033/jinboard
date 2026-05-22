# DreamBoard — 인계 / 이어서 작업 가이드

> 컨텍스트 클리어 후 작업 재개 시 이 문서 먼저 읽기. **미완료 사항 + 진행 중 목업 + 사용자 결정 사항이 핵심**.

---

## 📌 프로젝트 한줄 요약

개인 목표·드림·자산을 RPG 게임화한 단일 사용자 웹 대시보드.

- **사용자**: timpark1033@gmail.com (부동산 + 유튜브 + NoteUp 창업자)
- **배포**: jinboard.pages.dev (Cloudflare Pages, github `timpark1033/jinboard`, master → main)
- **현재 캐시버스터**: `?v=20260522t` (변경 시 다음 글자로 bump)

---

## 🗂️ 파일 구조

```
C:\Users\sj\Desktop\jinboard\
├── index.html           (~50줄)
├── styles.css           (~5,466줄)
├── app.js               (~6,234줄, 모든 React 코드)
└── ONBOARDING.md        ← 이 문서
```

### 목업 파일 (C:\Users\sj\Downloads\)
세션 중 만들어둔 디자인 검토용 HTML 목업들 (브라우저로 직접 열기):

| 파일 | 내용 | 상태 |
|------|------|------|
| `jinboard.html` | 대시보드 컨셉 A/B/C 비교 (초기) | ✅ B 구현 완료 |
| `jinboard-character.html` | 캐릭터 시트 3안 | ✅ B(레이더) 구현 완료 |
| `jinboard-resources-v2.html` | 자원 탭 정돈판 (사이드바+위젯) | ✅ 구현 완료 |
| `jinboard-tasks-tabs.html` | 업무 4탭 시스템 | ✅ 구현 완료 |
| `jinboard-task-edit-modals.html` | 할일 편집 3안 | ✅ X(좌측 사이드바) 구현 완료 |
| `jinboard-net-worth-goal.html` | 목표자산 3안 | ✅ B+C 조합 구현 완료 |
| `jinboard-resources-v3.html` | 자원탭 재기획 3안 | ✅ 매거진(C) 사용자 선택 → 미구현 |
| `jinboard-resources-magazine.html` | 매거진 + 상세 진입 3안 | (참고용) |
| **`jinboard-resources-magazine-v2.html`** | **매거진 + 풀스크린 모달 3탭** | 🔴 **사용자 확정 · 미구현** |
| **`jinboard-business-flow.html`** | **사업별 수입·지출 UI 3안** | 🟠 **사용자 선택 대기** |

---

## 🛠️ 기술 스택

- **React 18 + Babel standalone** (CDN, 빌드 단계 없음 — `<script type="text/babel">`)
- **Firebase**:
  - Auth: Google Sign-In, 단일 이메일 화이트리스트
  - Firestore: `users/{uid}` 단일 문서 (1MB 제한)
  - **Storage 활성화 완료** (Blaze 요금제, asia-northeast3) — 드림 이미지 + 캐릭터 아바타 업로드
- **CSS**: variable 기반 다크 테마
- **차트**: SVG 핸드롤

---

## 🎯 현재 탭 구조 (4탭)

1. **대시보드** — B 컨셉, 상단 캐릭터+KPI 5칸, 드림 갤러리 3-up, 목표 진행도
2. **목표·업무** — 4탭 시스템 내장 (4분면/달력/목표별/집중) + 좌측 목표 / 우측 회고
3. **자원·아이템** — 좌 사이드바(캐릭터/스탯/자원/인생) + 우 위젯 그리드 ← **재기획 대기**
4. **비전·드림** — 사명 중앙정렬 + 드림 갤러리 + 큰 계획 타임라인

---

## ✅ 최근 완료된 주요 기능 (시간 역순)

### 업무 시스템 (목표·업무 탭)
- **4탭**: 4분면 / 달력(주간·월간) / 목표별 / 집중모드 (`settings.taskTab` 영구 저장)
- **4분면**: 드래그&드롭으로 분면 이동, D-day 표시, 단일클릭=완료/더블클릭=편집
- **달력**: 주간/월간 토글, ◀ 오늘 ▶ 네비게이션, 셀 더블클릭→커스텀 입력 모달
- **목표별 업무**: 목표 단위로 컬럼 그룹, 컬러 보더, 컬럼 하단 더블클릭→간소화 모달
- **집중모드**: 25/5분 포모도로, 큐 드래그 정렬, 큐 가로폭 조절(`settings.focusQueueWidth`), 클릭→빠른추가/더블클릭→편집
- **대시보드 🍅 집중**: 상단바에서 풀스크린 집중모드 직진입

### 모달 (목표·할일 편집)
- **GoalEditModal**: 풀스크린 2열 (좌: 메인+퀘스트 / 우: 기본정보)
- **GoalDetailModal**: 메인 단계 + 퀘스트 2열, ✏ 수정 → 편집 모달로 이동
- **할일 편집**: 좌측 비주얼 사이드바 (Q색상 그라데이션 + 연결정보)
- **목표 색상 선택기**: 12개 프리셋 (Google Calendar 스타일)

### 재무 시스템
- **Finance 통합 모달**: 5탭(자산/부채/수입/지출/요약), 부채는 평면 리스트 + 카테고리 select (대출/보증금/카드)
- **재무 목표 위젯**: 자원탭 KPI 아래 3카드 (순자산/월수입/월저축)
- **FinancialGoalsModal**: 풀스크린, 좌측 3 입력 + 우측 도넛+마일스톤
- **금액 표기**: `fmtKR`이 풀 단위 ("20억 8,000만원") · 입력은 콤마 (`1,234,567`)
- ⚠️ **2026-05-22 변경 요청**: `1.4억` 단축 형태로 다시 (월수입·지출만 만원)

### 캐릭터 / 비전
- **CharacterHero**: 자원·아이템 탭 상단, 큰 아바타+레이더 차트 (Lv·XP·AI 생성)
- **자원탭 좌측 사이드바**: 캐릭터/능력치(6+보조)/자원/인생 sticky
- **AI 아바타 생성** (드림과 동일 흐름, Storage 폴백 base64)
- **사명**: 라벨 제거, 중앙 정렬, 14~50px 슬라이더
- **큰 계획 타임라인**: 텍스트 크기 슬라이더 (10~22px), 가로 균등 분배

### 대시보드
- 캐릭터/KPI 카드 세로 축소(80%), 1920~3840px 풀폭 미디어 쿼리
- 드림 갤러리 3-up 슬라이드 (5초마다 밀어내기, wrap-around)
- 드림 갤러리 텍스트 크기 슬라이더 (px 단위)
- 목표 진행도: 18px 이름 + D-day + 티어 메타
- 우상단 🍅 집중 버튼 (집중모드 직진입)

### 기타
- 화이트 그레이 톤다운 (text-2~4 한 단계 밝게)
- 회색 텍스트 가시성 개선
- 인벤토리 슬롯 크기 캡 (72px max, 컨테이너 쿼리로 아이콘 비례)
- 4분면 분면별 컬러 (Q1 빨강 / Q2 보라 / Q3 앰버 / Q4 회색)
- 보조 스탯 시스템 (메인 6개 외 추가 가능)

---

## 🔴 진행 중 / 다음 작업 (우선순위)

### 1️⃣ ~~자원·아이템 탭 매거진 리디자인~~ → **구현 완료 2026-05-22**

**참고 목업**: `C:\Users\sj\Downloads\jinboard-resources-magazine-v2.html`

**사용자 확정 사항**:
- 메인 레이아웃 = **매거진 듀얼 히어로**:
  - 🅐 좌: 💎 순자산 (보라 그라데이션, 76px 숫자)
  - 🅑 우: 💼 월수입 (골드 그라데이션, 76px 숫자)
  - 둘 다 푸터에 보조 정보 3개 (자산/부채/전월대비 또는 주수익/부수익/전월대비)
- 아래 미니 4-col 카드: 🏦 자산 / 🚨 부채 / 🪙 월저축 / 📉 월지출
- 카드 클릭 → 풀스크린 모달 (3탭)
- **모달 3탭** (요약을 첫 번째):
  - 📊 **요약** (기본 활성): 좌 큰 순자산 게이지 + 월 현금 흐름 / 우 4 미니 카드
  - 🏦 **자산·부채**: 좌우 분할 (자산 좌, 부채 우)
  - 💼 **수입·지출**: 좌우 분할 (수입 좌, 지출 우) — 예상 vs 실제 두 열
- **스마트 진입 동선**:
  - 순자산/월수입 (큰 히어로) 클릭 → 요약 탭
  - 자산/부채 (미니) → 자산·부채 탭
  - 월저축/월지출 (미니) → 수입·지출 탭

**금액 표기** (확정):
- 자산·부채·순자산: `22억`, `14.1억`, `-7.9억` (`fmtKR`을 단축형으로 되돌리기)
- 월수입·지출·저축: `+550만`, `-183만`, `+367만` (만원 단위)

**구현 시 영향**: `fmtKR` 함수 단축형으로 회귀, FinanceDetailModal 재구성, ResourcesItemsTab 메인 레이아웃 재작성

---

### 2️⃣ ~~사업별 수입·지출~~ → **사업별 자금 흐름 (구현 완료 2026-05-22)**

**참고 목업 (최종)**: `C:\Users\sj\Downloads\jinboard-business-final.html`

**확정 컨셉**:
- 2섹션만 — **주수입 / 부수입** (3사업 묶음 안 → 2섹션으로 단순화)
- 섹션명·아이콘·컬러 더블클릭 편집 (settings.incomeSections에 저장)
- 좌: 통합 입력 테이블 (한 곳에서 모두 입력)
- 우: 도넛 비중 카드 + 주/부 히어로 카드 2개
- 예상 컬럼 제거 — 금액 1컬럼
- 항목 추가: 상단 + 버튼 (인라인 행 포커스) + 하단 인라인 행 (Enter 제출)
- segment pill 클릭 → 주↔부 토글 / type pill 클릭 → 수입↔지출 전환

**데이터 모델 추가**:
- `settings.incomeSections`: `[{id, name, icon, color}, ...]` (기본 주수입/부수입)
- `incomes[]`/`expenses[]` 각 항목에 `segment: "primary"|"secondary"` 필드 (없으면 "primary")

**구현 위치**: `BusinessFlowSection` (app.js, FinanceDetailModal 직전). FinanceDetailModal의 ROW 2가 이걸로 대체됨.

---

### 3️⃣ Google Calendar 양방향 동기 (구현 보류)

**참고**: 달력 탭 헤더 "🔗 Google" 버튼 → 안내 모달

**미구현 이유**: OAuth 2.0 클라이언트 ID를 Google Cloud Console에서 사용자가 직접 생성해야 함. UI/안내만 있고 실제 API 호출은 없음.

**구현 시 작업량**: 2~4시간 (OAuth + Calendar API events.list/insert/patch/delete + 양방향 sync)

---

## 📊 데이터 모델 핵심

### Settings (Firestore + localStorage 일부)
```js
{
  geminiKey, geminiTextModel, geminiImageModel,
  weeklyTimePool, weeklyEnergyPool,
  birthDate, gender, expectedLifespan, retireAge,
  dreamGalleryNameSize,                 // px (14~32)
  characterAvatarUrl, characterName,
  gtrColumnWidths: [n,n,n],             // 목표·업무 3컬럼 폭 %
  gtrZoomLevel,                         // 0.9~1.5
  taskTab,                              // "eisen"|"weekly"|"field"|"focus"
  schedules: [{id,date,title}],         // 달력 일정
  calendarMode,                         // "week"|"month"
  focusQueue: [taskId,...],             // 집중 큐 순서
  focusQueueWidth,                      // px
  bigtTextSize,                         // 비전탭 큰계획 텍스트 (10~22)
  missionTextSize,                      // 사명 (14~50)
  financeSplit1, financeSplit2,         // 재무 모달 row1/row2 폭 %
  finGoals: { netWorth, monthlyIncome, monthlySavings, milestones: [] }
}
```

### Finance
```js
{
  assets: [{id, category: "estate"|"account"|"other", name, value, note}],
  debts:  [{id, category: "loan"|"deposit"|"card", name, value, note}],
  incomes: [{id, category: "regular"|"irregular", name, expected, actual, day}],
  expenses: [{id, category: "fixed"|"variable"|"oneoff", name, expected, actual, day}]
  // 🔮 사업별 확장 시: 각 항목에 business: "estate"|"youtube"|"home"|string 필드
}
```

### Goal
```js
{
  id, name, category, deadline, progress, tier,
  statId,                              // 연결 스탯 (XP 부여)
  color,                               // 사용자 지정 컬러 (선택)
  milestones: [{id, name, status, deadline, xpReward}],
  quests: [{id, name, current, target, unit, xpReward, xpPerStep, repeat, done, deadline}]
}
```

### Task
```js
{ id, text, done, quadrant: 1-4, goalId, questId, tag, dueDate, time }
```

---

## 🔑 주요 헬퍼 함수 위치

| 함수 | 위치(라인 ±) | 용도 |
|------|------------|------|
| `calcDday(dateStr)` | app.js:4 | 마감일 D-day |
| `calcLifeStats()` | app.js:17 | 인생 통계 |
| `statLevel()` / `STAT_LEVEL_REQ` | app.js:165 | 누적 XP → 레벨 |
| `migrateGoalQuests()` | app.js:72 | sideQuests+challenges → quests |
| `xpForTask()` | app.js | Q1=40, 나머지=15 |
| `compressImage` / `compressDataUrl` | app.js:~3090 | Canvas 압축 |
| `uploadDreamImageToStorage` | app.js:~3077 | Storage 업로드 (폴백 base64) |
| `geminiGenerateImage()` | app.js:~3045 | 나노바나나 이미지 생성 |
| `fmtKR(n)` | app.js:~270 | 한국어 통화 (현재 풀단위 "20억 8,000만원") |
| `fmtComma`, `parseComma` | app.js:~267 | 입력 콤마 포맷 |
| `goalColor(gId)` | app.js (GoalsTasksRetroTab 내) | 목표 색상 (g.color 또는 HSL 해시) |

---

## 🔧 개발 워크플로우

### 변경 후 배포
```bash
cd /c/Users/sj/Desktop/jinboard
# 1. 코드 수정
# 2. index.html의 ?v=20260522X 끝 글자 bump
# 3. 커밋 + 푸시
git add -A && git commit -m "..." && git push origin master:main
# 4. Cloudflare 자동 배포 1~2분
# 5. 사용자에게 Ctrl+Shift+R 안내
```

### CSS 추가 패턴 (heredoc 깨질 때)
큰 CSS는 `.tmp.css`로 Write 후 cat으로 styles.css에 append:
```bash
# Write tool로 임시 파일 작성 후
cat "/c/Users/sj/Desktop/jinboard/.tmp.css" >> styles.css && rm .tmp.css
```

### Big component 교체 (Dashboard 등)
긴 JSX 블록은 정확한 `old_string` 매칭으로 Edit (다단계로 쪼개기). JSX `</div>` 닫기 누락 주의 (이전 사고 사례).

---

## ⚠️ 주요 함정 / 알아둘 것

1. **Firestore 1MB 제한** — 모든 데이터 단일 문서. 이미지는 Storage로 분리됨.
2. **이미지 화질**: Storage 활성화로 base64 1MB 압박 해소됨. Storage 안 켰을 때는 base64 폴백 (강제 압축).
3. **React `e.stopPropagation()` ≠ native event 차단**: document.addEventListener는 별도 처리.
4. **한글 IME composition**: Enter 입력 시 첫 Enter는 조합 확정에 소비됨. `e.nativeEvent.isComposing` 가드 필수.
5. **CSS class 충돌**: 옛 `.db-zone3/4`, `.qb-*` CSS 일부 남아있음 (사용 안 됨, 정리 안 됨).
6. **localStorage settings vs Firestore settings**: 일부 (geminiKey 등) localStorage, 대부분은 Firestore 자동 저장.
7. **JSX 구조 오류**: 큰 컴포넌트 수정 시 `</div>` 매칭 꼭 확인 (검은 화면 사고 이전 발생).

---

## 📜 최근 커밋 흐름 (최신 → 과거 20개)

```
56cb136 feat: 목표별 업무 — 컬럼 하단 더블클릭 추가 영역 + 간소화 모달
6bdd8dd fix: 달력 칸 균등 폭 + 호버 텍스트 줄바꿈 제거
1c4ef1c feat: 달력 +일정 버튼 제거 + 셀 더블클릭 → 커스텀 입력 모달
edbda8c feat: 4분면 D-day 표시 + 재무 목표 위젯 + 풀스크린 설정 모달
9d0d96a feat: 4분면 업무 드래그&드롭 분면 이동
7ceed52 feat: 할일 편집 모달 — 좌측 비주얼 사이드바
7d41147 fix: 인벤토리 슬롯 크기 캡 + 아이콘 비율 조정
1352a94 feat: 주간 → 달력 (주간/월간 토글)
cd807a9 feat: 분야별 업무 → 목표별 업무
425078e feat: 집중 큐 — 클릭으로 빠른 추가 + 더블클릭으로 편집
b822c08 feat: 집중모드 업무 큐 가로 폭 드래그 조절
85e6f52 style: 집중모드 2열 + 현재 집중·시간 3배 확대
37bd4d3 feat: 업무 4탭 풀스크린 모드 + 상단바 🍅 집중 직진입
b33833e feat: 비전탭 사명 — 라벨 제거 + 중앙 정렬 + 슬라이더
b379546 feat: 금액 표기 — fmtKR '억 만원' 풀 단위 + 입력 콤마
471258e fix: 자산/부채/수익/지출 4-card 순서 명시
67f61bc style: 자원·아이템 상세 그리드 4열 한 행
e314a0f feat: 비전탭 캐릭터 스탯 섹션 제거 + 타임라인 텍스트 슬라이더
3219733 style: GoalEditModal 2열 레이아웃
62c1353 feat: 업무 4탭 시스템 + 대시보드 집중모드 진입 버튼
```

---

## 🚀 작업 재개 시 첫 단계 (추천 순서)

1. **[5분]** 이 문서 읽고 사용자에게 마지막 작업/관심사 확인
2. **[1~2시간] ①번 자원탭 매거진 리디자인 (확정)** ⭐
   - `jinboard-resources-magazine-v2.html` 목업 확인
   - `fmtKR`을 단축형 (`1.4억`)으로 회귀 + 월단위 처리 분기
   - ResourcesItemsTab의 메인 레이아웃을 듀얼 히어로 + 미니 4-col로 재작성
   - FinanceDetailModal 3탭 구조로 재작성 (요약/자산·부채/수입·지출)
   - 카드 → 모달 스마트 진입 (initialTab prop)
3. **[1시간] ②번 사업별 수입·지출** (사용자 선택 후)
   - 데이터 모델에 `business` 필드 마이그레이션
   - 선택된 UI 안으로 구현

각 단계 후 캐시버스터 bump + git push + Cloudflare 배포 대기 + 사용자 Ctrl+Shift+R 안내.

---

## 💬 사용자 톤 / 작업 스타일

- 한국어, 짧고 직설적인 응답 선호
- **큰 변경 전에 아이디어 회의 → 목업 → 컨펌 → 코드 반영** 순서 강력 선호
- 디자인 매우 중시. "세련된", "있어보이는", "게임 UI", "인포그래픽" 자주 언급
- 사진/스크린샷으로 시각 피드백 자주 줌
- TaskCreate/TaskList는 거의 사용 안 함 (시스템 리마인더 있을 때만 가끔)
- 디자인 결정 시 보통 3가지 옵션 + 추천 형태로 제안하면 좋아함

---

**이 문서 = 단일 진실의 출처. 미완료 항목 처리 끝낼 때마다 위 "🔴 진행 중" 섹션에서 제거하고 "✅ 완료" 섹션으로 옮기기.**

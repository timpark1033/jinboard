    const { useState, useEffect, useMemo, useRef } = React;

    /* --- helpers --- */
    function calcDday(dateStr) {
      const today = new Date();
      const target = new Date(dateStr);
      return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    }
    // 이번주 D-day (월=D-6 ~ 토=D-1, 일=D-0)
    function weekDday() {
      const dow = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      if (dow === 0) return 0; // 일요일 = 종료/리셋
      return 7 - dow; // 월(1)=6, 화=5, ..., 토(6)=1
    }
    // 인생 통계 (생년월일 기반)
    function calcLifeStats(birthDate, lifespan, retireAge) {
      if (!birthDate) return null;
      const ls = Number(lifespan) || 83.6;
      const ra = Number(retireAge) || 65;
      const today = new Date();
      const birth = new Date(birthDate);
      const age = (today - birth) / (365.25 * 24 * 60 * 60 * 1000);
      const remainingYears = Math.max(0, ls - age);
      const remainingDays = Math.floor(remainingYears * 365.25);
      const economicRemaining = Math.max(0, ra - age);
      const goldStart = 30, goldEnd = 49;
      const goldenProgress = age < goldStart ? 0 : age > goldEnd ? 100 : ((age - goldStart) / (goldEnd - goldStart)) * 100;
      const goldenRemaining = Math.max(0, goldEnd - age);
      return {
        age: Math.floor(age),
        ageDecimal: age,
        lifespan: ls, retireAge: ra,
        livedPercent: Math.round((age / ls) * 100),
        remainingYears: Math.round(remainingYears),
        remainingDays,
        economicPercent: Math.round((Math.min(age, ra) / ra) * 100),
        economicRemaining: Math.round(economicRemaining),
        goldenProgress: Math.round(goldenProgress),
        goldenRemaining: Math.round(goldenRemaining),
        inGolden: age >= goldStart && age <= goldEnd
      };
    }
    function fmtDeadline(dateStr) {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
    }
    function loadLS(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    }
    function saveLS(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }
    function getWeekNumber(d) {
      const date = d || new Date();
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      return Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    }
    function getWeekRange(weekOffset) {
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = d => `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
      return `${fmt(monday)} ~ ${fmt(sunday)}`;
    }

    /* ---------------- DATA ---------------- */
    /* ── 퀘스트 마이그레이션 (sideQuests + challenges → quests) ── */
    function migrateGoalQuests(g) {
      if (g.quests) return g;
      const quests = [];
      (g.sideQuests || []).forEach(s => quests.push({
        id: s.id, name: s.name,
        current: s.done ? 1 : 0, target: 1, unit: "회",
        xpReward: s.xpReward || 80, xpPerStep: 0,
        repeat: null, done: !!s.done
      }));
      (g.challenges || []).forEach(c => quests.push({
        id: c.id, name: c.name,
        current: c.done ? 1 : 0, target: 1, unit: "회",
        xpReward: c.xpReward || 500, xpPerStep: 0,
        repeat: c.repeat || null, done: !!c.done,
        lastResetWeek: c.repeat ? getWeekNumber() : null
      }));
      return { ...g, quests };
    }

    const INITIAL_GOALS = [
      {
        id: "g1",
        category: "Creator · 수익화",
        name: "유튜브 채널 수익화",
        progress: 45,
        color: "purple",
        deadline: "2026-12-31",
        milestones: [
          { id: "g1m1", name: "채널 세팅 완료", status: "done", kpi: null },
          { id: "g1m2", name: "영상 10개 업로드", status: "active",
            kpi: { label: "업로드 영상", current: 7, target: 10, unit: "개" } },
          { id: "g1m3", name: "구독자 1,000명 달성", status: "todo",
            kpi: { label: "구독자", current: 230, target: 1000, unit: "명" } },
        ],
        currentMilestone: { name: "영상 10개 업로드", kpi: "7/10", pct: 70 },
        quests: [
          { id: "g1q1", name: "역사 롱폼 10개 업로드", current: 3, target: 10, unit: "개", xpReward: 500, xpPerStep: 50, repeat: null, done: false },
          { id: "g1q2", name: "매주 영상 2편 업로드", current: 1, target: 2, unit: "편", xpReward: 30, xpPerStep: 15, repeat: "weekly", done: false, lastResetWeek: 21 },
          { id: "g1q3", name: "첫 협업 영상", current: 1, target: 1, unit: "회", xpReward: 60, xpPerStep: 0, repeat: null, done: true },
          { id: "g1q4", name: "굿즈 1종 출시", current: 0, target: 1, unit: "회", xpReward: 120, xpPerStep: 0, repeat: null, done: false },
        ],
      },
      {
        id: "g2",
        category: "NoteUp · 마케팅",
        name: "NoteUp 마케팅 콘텐츠",
        progress: 30,
        color: "indigo",
        deadline: "2026-09-30",
        milestones: [
          { id: "g2m1", name: "콘텐츠 기획 완료", status: "done", kpi: null },
          { id: "g2m2", name: "마케팅 영상 제작",  status: "active",
            kpi: { label: "제작 완료", current: 3, target: 10, unit: "편" } },
          { id: "g2m3", name: "배포 & 성과 측정", status: "todo",
            kpi: { label: "노출수", current: 0, target: 50000, unit: "회" } },
        ],
        currentMilestone: { name: "마케팅 영상 제작", kpi: "3/10", pct: 30 },
      },
      {
        id: "g3",
        category: "Side Project · 개발",
        name: "유튜브 자동화 프로그램",
        progress: 60,
        color: "purple",
        deadline: "2026-08-31",
        milestones: [
          { id: "g3m1", name: "프로젝트 기획 완료", status: "done", kpi: null },
          { id: "g3m2", name: "코어 모듈 개발",  status: "active",
            kpi: { label: "개발 진행률", current: 60, target: 100, unit: "%" } },
          { id: "g3m3", name: "베타 실험 운영", status: "todo",
            kpi: { label: "베타 유저", current: 0, target: 20, unit: "명" } },
        ],
        currentMilestone: { name: "코어 모듈 개발", kpi: "60%", pct: 60 },
      },
    ];

    const INITIAL_TASKS = [
      { id: "t1", text: "유튜브 영상 #8 편집 마무리", done: false, quadrant: 1, goalId: "g1", time: "10:00", tag: "유튜브", dueDate: "2026-05-25" },
      { id: "t2", text: "NoteUp 마케팅 영상 #4 콘티 작성", done: true, quadrant: 2, goalId: "g2", time: "11:30", tag: "NoteUp", dueDate: "" },
      { id: "t3", text: "자동화 프로그램 — 큐 처리 로직 리팩터", done: false, quadrant: 2, goalId: "g3", time: "14:00", tag: "개발", dueDate: "2026-06-01" },
      { id: "t4", text: "썸네일 A/B 시안 3개 제작", done: false, quadrant: 1, goalId: "g1", time: "16:00", tag: "유튜브", dueDate: "2026-05-28" },
      { id: "t5", text: "이번주 회고 메모 정리", done: false, quadrant: 2, goalId: null, time: "21:00", tag: "회고", dueDate: "" },
      { id: "t6", text: "주간 뉴스레터 훑기", done: true, quadrant: 4, goalId: null, time: "09:00", tag: "리서치", dueDate: "" },
      { id: "t7", text: "팔로워 DM 답장", done: false, quadrant: 3, goalId: "g1", time: "12:30", tag: "유튜브", dueDate: "" },
    ];

    const INITIAL_WEEKLY_GOALS = [
      { id: "w1", text: "유튜브 영상 2편 업로드", done: false, goalId: "g1", tag: "유튜브" },
      { id: "w2", text: "NoteUp 마케팅 영상 콘티 작성", done: false, goalId: "g2", tag: "NoteUp" },
      { id: "w3", text: "자동화 큐 처리 로직 완성", done: false, goalId: "g3", tag: "개발" },
    ];

    /* ── 스탯 레벨 시스템 (10레벨 만렙) ── */
    const STAT_LEVEL_REQ = [0, 100, 320, 720, 1420, 2520, 4320, 7120, 11320, 17820]; // 누적 XP
    const STAT_TITLES = ["입문자","견습생","숙련자","숙련자","전문가","전문가","고수","마스터","그랜드마스터","레전드"];

    function getStatTotalXp(s) {
      if (typeof s.totalXp === "number") return s.totalXp;
      // 구버전 마이그레이션: level + xp(0~100%)
      const lv = s.level || 1;
      const xpPct = s.xp || 0;
      const start = STAT_LEVEL_REQ[lv - 1] || 0;
      const end = STAT_LEVEL_REQ[lv] || STAT_LEVEL_REQ[9];
      return Math.round(start + (xpPct / 100) * (end - start));
    }
    function statLevel(totalXp) {
      for (let i = STAT_LEVEL_REQ.length - 1; i >= 0; i--) {
        if (totalXp >= STAT_LEVEL_REQ[i]) return i + 1;
      }
      return 1;
    }
    function statLevelProgress(totalXp) {
      const lv = statLevel(totalXp);
      if (lv >= 10) return { pct: 100, current: 0, needed: 0 };
      const start = STAT_LEVEL_REQ[lv - 1];
      const end = STAT_LEVEL_REQ[lv];
      return {
        pct: Math.round(((totalXp - start) / (end - start)) * 100),
        current: totalXp - start,
        needed: end - start
      };
    }

    const INITIAL_STATS = [
      { id: "youtube", icon: "📺", label: "유튜브", totalXp: 800,  desc: "구독자",     value: 230, unit: "명" },
      { id: "estate",  icon: "🏠", label: "부동산", totalXp: 2800, desc: "관리 물건",  value: 12,  unit: "건" },
      { id: "dev",     icon: "💻", label: "개발",   totalXp: 450,  desc: "완료 프로젝트", value: 5,  unit: "개" },
      { id: "english", icon: "🌏", label: "영어",   totalXp: 180,  desc: "학습 시간", value: 20, unit: "h" },
      { id: "health",  icon: "💪", label: "건강",   totalXp: 1800, desc: "주 운동",    value: 3,   unit: "회" },
      { id: "finance", icon: "💰", label: "재정",   totalXp: 3200, desc: "월 수익",    value: 320, unit: "만원" },
    ];

    const INITIAL_RESOURCES = {
      money: { income: 5200000, expenses: 3400000 },
      energy: { weeklyPool: 100, used: 32 },
      time: { weeklyPool: 72, used: 45.5 }
    };

    /* ── 대시보드 상단 KPI 카드 (사용자 정의) ── */
    const INITIAL_SUMMARY_CARDS = [
      { id: "sc1", icon: "💎", name: "목표 자산", value: 218000000, unit: "원", target: 1000000000, type: "asset" },
      { id: "sc2", icon: "🏠", name: "부동산", value: 1500000, unit: "원/월", type: "income", changePct: 5.6 },
      { id: "sc3", icon: "📺", name: "유튜브", value: 320000, unit: "원/월", type: "income", changePct: 128 }
    ];

    /* ── 재무관리 (자산/수입/지출) ── */
    const INITIAL_FINANCE = {
      assets: [
        { id: "a1", category: "estate", name: "강남 아파트", value: 1500000000, note: "" },
        { id: "a2", category: "estate", name: "서초 빌라", value: 650000000, note: "" },
        { id: "a3", category: "account", name: "주거래 통장", value: 12000000, note: "" },
        { id: "a4", category: "account", name: "주식 계좌", value: 8500000, note: "" }
      ],
      debts: [],
      incomes: [
        { id: "in1", category: "regular", name: "임대료", expected: 1500000, actual: 1500000, day: 1 },
        { id: "in2", category: "regular", name: "본업", expected: 3500000, actual: 3500000, day: 25 },
        { id: "in3", category: "irregular", name: "컨설팅", expected: 500000, actual: 0, day: 0 }
      ],
      expenses: [
        { id: "ex1", category: "fixed", name: "생활비", expected: 2000000, actual: 2000000, day: 1 },
        { id: "ex2", category: "fixed", name: "대출 이자", expected: 800000, actual: 800000, day: 5 },
        { id: "ex3", category: "fixed", name: "넷플릭스", expected: 17000, actual: 17000, day: 1 },
        { id: "ex4", category: "variable", name: "외식", expected: 400000, actual: 320000, day: 0 },
        { id: "ex5", category: "variable", name: "쇼핑", expected: 300000, actual: 150000, day: 0 }
      ]
    };
    const ASSET_CATS = { estate: "🏠 부동산", account: "💳 계좌", other: "📦 기타" };
    const DEBT_CATS = { loan: "💳 대출", deposit: "🔒 보증금", card: "💸 카드" };
    const INCOME_CATS = { regular: "정기 수입", irregular: "비정기 수입" };
    const EXPENSE_CATS = { fixed: "고정 지출", variable: "변동 지출", oneoff: "1회성 지출" };

    function sumAssets(finance, category) {
      return (finance.assets || []).filter(a => !category || a.category === category).reduce((s, a) => s + (a.value || 0), 0);
    }
    function sumDebts(finance, category) {
      return (finance.debts || []).filter(d => !category || d.category === category).reduce((s, d) => s + (d.value || 0), 0);
    }
    function sumNetWorth(finance) {
      return sumAssets(finance) - sumDebts(finance);
    }
    function sumIncome(finance, items) {
      const base = (finance.incomes || []).reduce((s, i) => s + (i.expected || 0), 0);
      const buff = (items || []).filter(i => i.status === "equipped").reduce((s, it) => s + (it.buffs || []).filter(b => b.type === "money").reduce((ss, b) => ss + b.value, 0), 0);
      return base + buff;
    }
    function sumIncomeActual(finance) {
      return (finance.incomes || []).reduce((s, i) => s + (i.actual || 0), 0);
    }
    function sumExpense(finance, items) {
      const base = (finance.expenses || []).reduce((s, e) => s + (e.expected || 0), 0);
      const debuff = (items || []).filter(i => i.status === "equipped").reduce((s, it) => s + (it.debuffs || []).filter(d => d.type === "money").reduce((ss, d) => ss + d.value, 0), 0);
      return base + debuff;
    }
    function sumExpenseActual(finance) {
      return (finance.expenses || []).reduce((s, e) => s + (e.actual || 0), 0);
    }
    // 콤마 포맷 (입력 표시용): 1234567 → "1,234,567"
    function fmtComma(n) { return Number(n || 0).toLocaleString(); }
    function parseComma(str) { return Number(String(str || "").replace(/[^0-9-]/g, "")) || 0; }

    /* 매거진 히어로용 단축 포맷: 1.4억 / 22억 / -7.9억 / 1,234만 */
    function fmtKRShort(n) {
      const num = Math.round(Number(n) || 0);
      if (num === 0) return "0";
      const sign = num < 0 ? "-" : "";
      const abs = Math.abs(num);
      if (abs >= 100000000) {
        const eok = abs / 100000000;
        return sign + (eok >= 100 ? Math.round(eok).toLocaleString() : eok.toFixed(1).replace(/\.0$/, "")) + "억";
      }
      if (abs >= 10000) {
        return sign + Math.round(abs / 10000).toLocaleString() + "만";
      }
      return sign + abs.toLocaleString();
    }
    /* 부호 명시: +320만 / -120만 / +14.1억 */
    function fmtKRShortSigned(n) {
      const num = Math.round(Number(n) || 0);
      if (num === 0) return "0";
      const prefix = num > 0 ? "+" : "";
      return prefix + fmtKRShort(num);
    }

    function fmtKR(n) {
      const num = Math.round(Number(n) || 0);
      if (num === 0) return "0원";
      const sign = num < 0 ? "-" : "";
      const abs = Math.abs(num);
      const eok = Math.floor(abs / 100000000);
      const man = Math.floor((abs % 100000000) / 10000);
      const won = abs % 10000;
      const parts = [];
      if (eok > 0) parts.push(eok.toLocaleString() + "억");
      if (man > 0) parts.push(man.toLocaleString() + "만");
      if (won > 0) parts.push(won.toLocaleString());
      return sign + parts.join(" ") + "원";
    }
    // 만원 단위 숫자 → "1억 1,000만원" 형식
    function fmtManwon(num) {
      const n = Number(num) || 0;
      if (n <= 0) return "0원";
      const eok = Math.floor(n / 10000);
      const man = n % 10000;
      if (eok > 0 && man > 0) return eok.toLocaleString() + "억 " + man.toLocaleString() + "만원";
      if (eok > 0) return eok.toLocaleString() + "억원";
      return man.toLocaleString() + "만원";
    }

    /* 2026.05 기준 추천 모델 (Top 3) */
    const GEMINI_TEXT_MODELS = [
      { id: "gemini-3.1-pro-preview",  label: "🥇 Gemini 3.1 Pro (최고 추론)" },
      { id: "gemini-3.5-flash",        label: "🥈 Gemini 3.5 Flash (GA · 균형)" },
      { id: "gemini-2.5-flash",        label: "🥉 Gemini 2.5 Flash (안정)" }
    ];
    const GEMINI_IMAGE_MODELS = [
      { id: "gemini-3-pro-image-preview",   label: "🥇 나노바나나 Pro (최고 품질)" },
      { id: "gemini-3.1-flash-image-preview", label: "🥈 나노바나나 2 (균형 · 1K)" },
      { id: "gemini-2.5-flash-image",        label: "🥉 나노바나나 1 (가성비)" }
    ];

    /* 셧다운된 / 옛 모델명 → 새 기본값 자동 마이그레이션 */
    const DEAD_MODELS = new Set([
      "gemini-2.5-flash-image-preview",      // 셧다운 (2026.05)
      "gemini-2.0-flash-exp-image-generation" // deprecated
    ]);

    const INITIAL_SETTINGS = {
      geminiKey: "",
      geminiTextModel: "gemini-3.5-flash",
      geminiImageModel: "gemini-3.1-flash-image-preview",
      weeklyTimePool: 72,
      weeklyEnergyPool: 100,
      birthDate: "",
      gender: "male",
      expectedLifespan: 80.6,
      retireAge: 65,
      dreamGalleryNameSize: 19,
      characterAvatarUrl: "",
      characterName: "",
      gtrColumnWidths: [35, 40, 25],
      gtrZoomLevel: 1,
      finGoals: { netWorth: 3000000000, monthlyIncome: 10000000, monthlySavings: 5000000, milestones: [] },
      incomeSections: [
        { id: "primary",   name: "주수입", icon: "🏠", color: "#fbbf24" },
        { id: "secondary", name: "부수입", icon: "📺", color: "#6366f1" }
      ]
    };
    const SECTION_COLOR_PRESETS = ["#fbbf24", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
    const SECTION_ICON_PRESETS = ["🏠","📺","💼","💎","🚀","🎯","⚡","🏢","💰","📦","🎨","🛒"];

    const INITIAL_RETROS = [
      { id: "r1", week: "W20 · 2026", date: "05.10 ~ 05.16",
        good: "유튜브 영상 2편 완성, NoteUp 기획 완료",
        bad: "체력 관리 소홀, 운동 1회 그침",
        improve: "화목 운동 고정 루틴 만들기" },
      { id: "r2", week: "W19 · 2026", date: "05.03 ~ 05.09",
        good: "자동화 프로그램 핵심 로직 완성",
        bad: "유튜브 콘텐츠 기획 계속 미룸",
        improve: "매일 아침 30분 콘텐츠 기획 시간 확보" },
    ];

    const INITIAL_VISION = {
      mission: "부동산과 콘텐츠로 경제적 자유를 이루고, 가족과 함께하는 시간을 늘린다",
      timeline: [
        { year: 2024, current: false, items: [{ text: "부동산 사업 시작", state: "done" }, { text: "유튜브 채널 개설", state: "done" }] },
        { year: 2025, current: false, items: [{ text: "직원 채용", state: "done" }, { text: "유튜브 구독자 500명", state: "done" }] },
        { year: 2026, current: true,  items: [{ text: "유튜브 수익화", state: "active" }, { text: "자동화 시스템 완성", state: "active" }] },
        { year: 2027, current: false, items: [{ text: "프리랜서팀 운영", state: "future" }, { text: "월 수익 1,000만", state: "future" }] },
        { year: 2028, current: false, items: [{ text: "부동산 지점 확장", state: "future" }, { text: "경제적 자유 달성", state: "future" }] },
      ],
    };

    const INITIAL_NEXT_WEEKLY_GOALS = [
      { id: "nw1", text: "유튜브 영상 #9 기획 완료", done: false },
      { id: "nw2", text: "NoteUp 마케팅 영상 #5 촬영", done: false },
    ];

    const INITIAL_STREAK = [true, true, false, false, false, false, false]; // 월화 완료, 수(오늘)부터 미완료

    const INITIAL_TOP_THREE = [
      { slot: 1, text: "", done: false, date: "" },
      { slot: 2, text: "", done: false, date: "" },
      { slot: 3, text: "", done: false, date: "" },
    ];
    const INITIAL_DAILY_LOG = {};

    /* ── 드림 티어 시스템 ── */
    const DREAM_TIERS = {
      legend: { label: "LEGEND", xp: 5000, color: "legend" },
      epic:   { label: "EPIC",   xp: 2500, color: "epic" },
      rare:   { label: "RARE",   xp: 1000, color: "rare" },
      normal: { label: "NORMAL", xp: 400,  color: "normal" }
    };
    function inferDreamTier(d) {
      if (d.tier) return d.tier;
      const amt = d.targetAmount || 0;
      if (amt >= 100000) return "legend";
      if (amt >= 30000) return "epic";
      if (amt >= 5000) return "rare";
      return "normal";
    }

    const INITIAL_DREAMS = [
      { id: "d1", name: "아파트 이사", emoji: "🏠", tier: "legend", targetAmount: 150000, currentAmount: 30000, unit: "만원", imgUrl: "",
        calc: { monthlySavings: 500, targetYears: 5 } },
      { id: "d2", name: "제네시스 GV80", emoji: "🚗", tier: "epic", targetAmount: 20000, currentAmount: 0, unit: "만원", imgUrl: "",
        calc: { monthlySavings: 200, targetYears: 3 } },
    ];

    const QUADRANTS = [
      { id: 1, num: "Q1", title: "긴급 · 중요",     sub: "Do First",    dot: "q1" },
      { id: 2, num: "Q2", title: "긴급X · 중요",    sub: "Schedule",    dot: "q2" },
      { id: 3, num: "Q3", title: "긴급 · 중요X",    sub: "Delegate",    dot: "q3" },
      { id: 4, num: "Q4", title: "긴급X · 중요X",   sub: "Eliminate",   dot: "q4" },
    ];

    const TAG_COLORS = {
      "유튜브": "tag-purple",
      "NoteUp": "tag-blue",
      "개발": "tag-purple",
      "회고": "tag-amber",
      "리서치": "tag-amber",
    };
    const DOT_COLORS = {
      "유튜브": "dot-purple",
      "NoteUp": "dot-blue",
      "개발": "dot-purple",
      "회고": "dot-amber",
      "리서치": "dot-gray",
    };

    /* ---------------- COMPONENTS ---------------- */

    function RingChart({ value, size = 64, stroke = 6 }) {
      const r = (size - stroke) / 2;
      const c = 2 * Math.PI * r;
      const [shown, setShown] = useState(0);
      useEffect(() => {
        const id = requestAnimationFrame(() => setShown(value));
        return () => cancelAnimationFrame(id);
      }, [value]);
      const offset = c - (shown / 100) * c;
      return (
        <div className="ring-wrap" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`}>
            <circle className="ring-bg" cx={size/2} cy={size/2} r={r} />
            <circle
              className="ring-fg"
              cx={size/2} cy={size/2} r={r}
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="ring-label">
            <span>{Math.round(shown)}</span><span className="pct">%</span>
          </div>
        </div>
      );
    }

    function ChevronIcon() {
      return (
        <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      );
    }

    /* ---------- Tabs ---------- */
    function Tabs({ active, onChange }) {
      const items = [
        { id: "dashboard", num: "01", label: "대시보드" },
        { id: "gtr",       num: "02", label: "목표 · 업무" },
        { id: "resources", num: "03", label: "자원 · 아이템" },
        { id: "vision",    num: "04", label: "비전 · 드림" },
      ];
      return (
        <div className="tabs" role="tablist">
          {items.map((it) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={active === it.id}
              className={"tab" + (active === it.id ? " active" : "")}
              onClick={() => onChange(it.id)}
            >
              <span className="tab-num">{it.num}</span>
              {it.label}
            </button>
          ))}
        </div>
      );
    }


    /* ---------- DreamGallery 3-up Slide ---------- */
    function DreamGallery2Up({ dreams, onDreamClick, nameSize = 19 }) {
      const PER_PAGE = 3;
      const n = dreams.length;
      // 페이지 배열: [0,1,2], [3,4,5], ... 부족하면 wrap-around
      const pairs = React.useMemo(() => {
        if (n === 0) return [];
        if (n < PER_PAGE) {
          const slot = [];
          for (let k = 0; k < PER_PAGE; k++) slot.push(dreams[k % n]);
          return [slot];
        }
        const arr = [];
        for (let i = 0; i < n; i += PER_PAGE) {
          const slot = [];
          for (let k = 0; k < PER_PAGE; k++) slot.push(dreams[(i + k) % n]);
          arr.push(slot);
        }
        return arr;
      }, [dreams]);

      const [pairIdx, setPairIdx] = useState(0);
      const [paused, setPaused] = useState(false);

      useEffect(() => {
        if (paused || pairs.length <= 1) return;
        const t = setInterval(() => setPairIdx(i => (i + 1) % pairs.length), 5000);
        return () => clearInterval(t);
      }, [paused, pairs.length]);

      // pairIdx 안전성: pairs 길이 변하면 reset
      useEffect(() => {
        if (pairIdx >= pairs.length) setPairIdx(0);
      }, [pairs.length, pairIdx]);

      if (n === 0) {
        return <div style={{ color: "var(--text-4)", padding: 30, fontSize: 13, textAlign: "center" }}>비전·드림 탭에서 드림 추가</div>;
      }

      return (
        <div className="dc2-viewport" style={{ "--dc2-scale": (nameSize / 19) }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="dc2-track" style={{ width: (pairs.length * 100) + "%", transform: "translateX(-" + (pairIdx * (100 / pairs.length)) + "%)" }}>
            {pairs.map((pair, pi) => (
              <div key={pi} className="dc2-pair" style={{ width: (100 / pairs.length) + "%" }}>
                {pair.map((d, slot) => {
                  const pct = d.targetAmount > 0 ? Math.min(100, Math.round((d.currentAmount / d.targetAmount) * 100)) : 0;
                  const tier = inferDreamTier(d);
                  return (
                    <div key={pi + "-" + slot + "-" + d.id} className="dc2-card" onClick={() => onDreamClick && onDreamClick(d.id)}>
                      <div className="dc-img">{d.imgUrl ? <img src={d.imgUrl} alt="" /> : (d.emoji || "⭐")}</div>
                      <span className={"dc-tier " + tier}>{tier.toUpperCase()}</span>
                      <div className="dc-overlay">
                        <div className="dc-name">{d.name}</div>
                        <div className="dc-pct">{pct}%</div>
                        <div className="dc-bar"><div style={{ width: pct + "%" }}></div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {pairs.length > 1 && (
            <div className="dc2-dots">
              {pairs.map((_, i) => (
                <span key={i} className={"dc2-dot " + (i === pairIdx ? "active" : "")} onClick={() => setPairIdx(i)} />
              ))}
            </div>
          )}
        </div>
      );
    }

    /* ---------- TAB 1: Dashboard (B 컨셉 개편) ---------- */
    function Dashboard({ goals, tasks, toggleTask, stats, dreams, streak, dailyLog, focusMode, setFocusMode, resources, onOpenSettings, onOpenResources, onDreamClick, toggleStage, adjustQuestCount, onOpenQuestGuide, onEditGoal, summaryCards, setSummaryCards, settings, onOpenGoalDetail, finance, items, onOpenFinGoals }) {
      const [ctxMenu, setCtxMenu] = useState(null); // { x, y, cardId }
      const [editingCardId, setEditingCardId] = useState(null);
      const [iconPickerId, setIconPickerId] = useState(null);

      // 인생 통계
      const life = calcLifeStats(settings?.birthDate, settings?.expectedLifespan, settings?.retireAge);
      const totalLv = stats.reduce((a, s) => a + statLevel(getStatTotalXp(s)), 0);
      const totalXp = stats.reduce((a, s) => a + getStatTotalXp(s), 0);
      const maxXp = STAT_LEVEL_REQ[9] * 6;

      // KPI 카드 작업
      const moveCard = (idx, delta) => {
        const next = [...summaryCards];
        const newIdx = idx + delta;
        if (newIdx < 0 || newIdx >= next.length) return;
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        setSummaryCards(next);
      };
      const updateCard = (id, updates) => setSummaryCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      const deleteCard = (id) => { if (confirm("이 카드를 삭제하시겠어요?")) setSummaryCards(prev => prev.filter(c => c.id !== id)); };
      const addCard = () => {
        const id = "sc" + Date.now();
        setSummaryCards(prev => [...prev, { id, icon: "📊", name: "새 항목", value: 0, unit: "원", type: "income", changePct: 0 }]);
        setEditingCardId(id);
      };

      // 우클릭 컨텍스트 메뉴
      const onCardContext = (cardId) => (e) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, cardId });
      };

      const fmtVal = (n) => {
        if (n >= 100000000) return (n / 100000000).toFixed(2);
        if (n >= 10000) return Math.round(n / 10000).toLocaleString();
        return n.toLocaleString();
      };
      const fmtUnit = (n, unit) => {
        if (n >= 100000000) return "억";
        if (n >= 10000 && /원/.test(unit)) return /월/.test(unit) ? "만/월" : "만";
        return unit;
      };

      const ITEM_EMOJIS = ["💎","🏠","📺","💼","🚗","✈️","🎬","🤖","💻","📱","💰","💵","🏦","📈","📊","🎯","🌟","🔥","⚡","🏆","🥇","💪","🎨","📚","🎵","📸","🧠","🌏","🍕","☕"];

      return (
        <div className="db2-root">

          {/* ZONE TOP: 듀얼 게이지 (1/3) + KPI 3개 (2/3) */}
          <div className="db2-top">
            <div className="life-card clickable" onClick={() => onOpenResources && onOpenResources()} title="클릭 → 자원·아이템 탭 (캐릭터 상세)">
              <div className="life-left">
                <div className="card-title"><span className="dot-purple"/>⚔️ 캐릭터</div>
                <div className="life-lv-circle">
                  <svg viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="68" fill="none" stroke="var(--bg-3)" strokeWidth="8"/>
                    <circle cx="80" cy="80" r="68" fill="none" stroke="url(#ringGrad)" strokeWidth="8" strokeDasharray="427" strokeDashoffset={427 - (totalXp / maxXp) * 427} strokeLinecap="round" transform="rotate(-90 80 80)" style={{ filter: "drop-shadow(0 0 10px rgba(139,92,246,0.5))" }}/>
                  </svg>
                  <div className="life-lv-inner">
                    <div className="life-lv-num">{totalLv}</div>
                    <div className="life-lv-lbl">/ 60 Lv</div>
                  </div>
                </div>
                <div className="life-xp-bar"><div style={{ width: Math.min(100, (totalXp / maxXp) * 100) + "%" }} /></div>
                <div className="life-xp-text">{totalXp.toLocaleString()} XP <span style={{ color: "var(--text-4)" }}>· 만렙까지 {Math.round((totalXp / maxXp) * 100)}%</span></div>
              </div>

              <div className="life-divider"></div>

              <div className="life-right">
                {life ? (
                  <>
                    <div className="card-title"><span className="dot-purple"/>🛤️ 인생 <span style={{ marginLeft: "auto", fontFamily: "Geist Mono, monospace", color: "var(--text-3)", fontSize: 11 }}>{life.age}세 / {life.lifespan}세</span></div>
                    <div className="life-gauge-row">
                      <div className="lgr-lbl"><span>⌛ 인생</span><span className="v">{life.livedPercent}% 살았음 · 남은 {life.remainingYears}년</span></div>
                      <div className="lgr-bar"><div className="lgr-fill" style={{ width: life.livedPercent + "%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}></div></div>
                    </div>
                    <div className="life-gauge-row">
                      <div className="lgr-lbl"><span>💼 경제활동</span><span className="v">{life.economicPercent}% 사용 · 남은 {life.economicRemaining}년 ({life.retireAge}세 은퇴)</span></div>
                      <div className="lgr-bar"><div className="lgr-fill" style={{ width: life.economicPercent + "%", background: "linear-gradient(90deg, var(--blue), var(--accent-2))" }}></div></div>
                    </div>
                    {life.inGolden && (
                      <div className="life-gauge-row">
                        <div className="lgr-lbl"><span>🌟 황금기 (30~49)</span><span className="v" style={{ color: "var(--accent)" }}>{life.goldenProgress}% 진행 · {life.goldenRemaining}년 남음</span></div>
                        <div className="lgr-bar"><div className="lgr-fill" style={{ width: life.goldenProgress + "%", background: "linear-gradient(90deg, var(--accent), #fbbf24)", boxShadow: "0 0 12px rgba(245,158,11,0.4)" }}></div></div>
                      </div>
                    )}
                    <div className="life-tip">💡 <strong>{life.inGolden ? "황금기 골든타임" : life.age < 30 ? "탐색기" : "원숙기"}</strong> — {life.inGolden ? "시간·체력·집중력 모두 최고치. 큰 그림 그릴 적기." : life.age < 30 ? "다양한 시도와 학습의 시기." : "전문성과 영향력으로 수확."}</div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--text-3)", padding: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>설정에서 생년월일 입력 시</div>
                    <div style={{ fontSize: 12, color: "var(--text-4)" }}>인생 게이지가 표시됩니다</div>
                    <button onClick={(e) => { e.stopPropagation(); onOpenSettings && onOpenSettings(); }} style={{ background: "transparent", border: "1px dashed var(--border-accent)", color: "var(--accent)", padding: "6px 16px", borderRadius: 6, marginTop: 10, cursor: "pointer", fontFamily: "Geist, sans-serif", fontSize: 12 }}>⚙ 설정 열기</button>
                  </div>
                )}
              </div>
            </div>

            <div className="db2-kpi-stack">
              {(() => {
                // 재무 데이터와 라이브 매칭 — 저장된 값 대신 finance에서 derive
                const fin = finance || {};
                const sections = (settings?.incomeSections && settings.incomeSections.length >= 2) ? settings.incomeSections : INITIAL_SETTINGS.incomeSections;
                const incomesArr = fin.incomes || [];
                const totalA = (fin.assets || []).reduce((s, a) => s + (a.value || 0), 0);
                const totalD = (fin.debts || []).reduce((s, d) => s + (d.value || 0), 0);
                const liveNetWorth = totalA - totalD;
                const primarySum = incomesArr.filter(i => (i.segment || "primary") === sections[0].id).reduce((s, i) => s + (i.actual || i.expected || 0), 0);
                const secondarySum = incomesArr.filter(i => (i.segment || "primary") === sections[1].id).reduce((s, i) => s + (i.actual || i.expected || 0), 0);
                const finGoals = settings?.finGoals || {};
                window.__liveSummaryData = { liveNetWorth, primarySum, secondarySum, primaryName: sections[0].name, secondaryName: sections[1].name, targetNetWorth: finGoals.netWorth || 0 };
                return null;
              })()}
              {summaryCards.map((c, idx) => {
                const isEditing = editingCardId === c.id;
                const isIconPicker = iconPickerId === c.id;
                const isAsset = c.type === "asset";
                // 라이브 데이터 매핑: 1번 = 순자산(asset), 2번 = 주수입, 3번 = 부수입
                const live = window.__liveSummaryData || {};
                let displayValue = c.value;
                let displayTarget = c.target;
                let displayName = c.name;
                if (isAsset && idx === 0) {
                  displayValue = live.liveNetWorth || 0;
                  displayTarget = live.targetNetWorth || c.target;
                } else if (!isAsset && idx === 1) {
                  displayValue = live.primarySum || 0;
                  displayName = c.name || live.primaryName;
                } else if (!isAsset && idx === 2) {
                  displayValue = live.secondarySum || 0;
                  displayName = c.name || live.secondaryName;
                }
                const pct = isAsset && displayTarget > 0 ? Math.min(100, (displayValue / displayTarget) * 100) : null;
                const isLast = idx === summaryCards.length - 1;
                const linked = c.linkedSection || (c.type === "asset" ? "assets" : (idx === 1 ? "incomes" : "incomes"));
                const handleCardClick = () => {
                  if (isAsset && onOpenFinGoals) { onOpenFinGoals(); return; }
                  onOpenResources && onOpenResources(linked);
                };
                const titleText = isAsset ? "클릭 → 재무 목표 설정 모달" : ("클릭 → 자원·아이템 탭의 " + linked + " 섹션");
                return (
                  <div key={c.id} className="kpi-big" onContextMenu={onCardContext(c.id)} onClick={handleCardClick} style={{ cursor: "pointer" }} title={titleText}>
                    {isLast && summaryCards.length < 4 && (
                      <button onClick={(e) => { e.stopPropagation(); addCard(); }} className="kpi-add-mini" title="새 KPI 카드 추가">+</button>
                    )}
                    <span className="ic-bg">{c.icon}</span>
                    <div className="kpi-lbl-row">
                      {isIconPicker ? (
                        <div className="kpi-icon-picker" onClick={(e) => e.stopPropagation()}>
                          {ITEM_EMOJIS.map(e => (
                            <button key={e} onClick={() => { updateCard(c.id, { icon: e }); setIconPickerId(null); }} className={c.icon === e ? "selected" : ""}>{e}</button>
                          ))}
                        </div>
                      ) : isEditing ? (
                        <input type="text" autoFocus value={c.name} onChange={(e) => updateCard(c.id, { name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingCardId(null); }}
                          onBlur={() => setEditingCardId(null)}
                          style={{ background: "var(--bg-3)", border: "1px solid var(--accent)", color: "var(--text-1)", padding: "3px 7px", borderRadius: 4, fontSize: 12, fontFamily: "inherit", outline: "none", width: "100%" }} />
                      ) : (
                        <span className="kpi-lbl-text" onClick={(e) => { e.stopPropagation(); setEditingCardId(c.id); }} title="클릭으로 이름 수정 · 우클릭 메뉴">{displayName}</span>
                      )}
                    </div>
                    <div className="kpi-val-huge">
                      {fmtVal(displayValue)}<span className="u">{fmtUnit(displayValue, c.unit)}</span>
                    </div>
                    {isAsset ? (
                      <div className="kpi-val-sub">/ {fmtVal(displayTarget)}{fmtUnit(displayTarget, c.unit)} 목표 · <span style={{ color: "var(--accent)" }}>✏ 클릭 설정</span></div>
                    ) : (
                      <div className="kpi-val-sub">월 수익 · 재무 데이터 자동 매칭{c.changePct ? " · 전월 " + (c.changePct >= 0 ? "↑" : "↓") + " " + Math.abs(c.changePct) + "%" : ""}</div>
                    )}
                    <div className="kpi-prog-line">
                      {isAsset ? (
                        <>
                          <div className="kpi-prog-bar"><div style={{ width: pct + "%" }} /></div>
                          <span className="kpi-prog-pct">{pct.toFixed(1)}%</span>
                        </>
                      ) : (
                        <>
                          <div className="kpi-prog-bar"><div style={{ width: Math.min(100, Math.abs(c.changePct || 0)) + "%", background: "linear-gradient(90deg, var(--green), #34d399)" }} /></div>
                          <span className="kpi-prog-pct" style={{ color: (c.changePct || 0) >= 0 ? "var(--green)" : "var(--red)" }}>{(c.changePct || 0) >= 0 ? "↑" : "↓"} {Math.abs(c.changePct || 0)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ZONE DREAM: 2-up 슬라이드 (5초마다 다음 페어로 밀어냄) */}
          <div className="db2-section">
            <div className="db2-section-head">🌟 드림 갤러리 <span className="hint">3개씩 · 5초마다 밀어내기 · 호버 시 정지</span></div>
            <DreamGallery2Up dreams={dreams} onDreamClick={onDreamClick} nameSize={(settings?.dreamGalleryNameSize >= 14 && settings?.dreamGalleryNameSize <= 32) ? settings.dreamGalleryNameSize : 19} />
          </div>

          {/* ZONE GOALS: 큰 원형 게이지들 (클릭 → 세부 모달) */}
          <div className="db2-section">
            <div className="db2-section-head">🎯 목표 진행도 <span className="hint">클릭 → 세부 대시보드</span></div>
            <div className="db2-goals-grid">
              {goals.map(g => {
                const stages = g.milestones || [];
                const done = stages.filter(m => m.status === "done").length;
                const pct = stages.length > 0 ? Math.round((done / stages.length) * 100) : (g.progress || 0);
                const tier = g.tier || "normal";
                const dday = calcDday(g.deadline);
                const offset = 427 - (pct / 100) * 427;
                return (
                  <div key={g.id} className="db2-goal-cell" onClick={() => onOpenGoalDetail && onOpenGoalDetail(g.id)}>
                    <div className="big-ring">
                      <svg viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="68" fill="none" stroke="var(--bg-3)" strokeWidth="10"/>
                        <circle cx="80" cy="80" r="68" fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeDasharray="427" strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 80 80)" style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.5))" }}/>
                      </svg>
                      <div className="br-label">
                        <span className="br-pct">{pct}<span className="u">%</span></span>
                      </div>
                    </div>
                    <div className="db2-goal-name">{g.name}</div>
                    <div className="db2-goal-meta">
                      <span className={"br-tier " + tier}>{tier.toUpperCase()}</span>
                      <span style={{ color: "var(--text-4)" }}>·</span>
                      <span style={{ color: dday <= 30 ? "var(--red)" : dday <= 90 ? "var(--amber)" : "var(--accent)", fontWeight: 700 }}>D-{dday}</span>
                      <span style={{ color: "var(--text-4)" }}>·</span>
                      <span style={{ color: "var(--text-3)" }}>단계 {done}/{stages.length}</span>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text-4)", padding: 30 }}>목표·업무 탭에서 목표를 추가하세요</div>}
            </div>
          </div>

          {/* 우클릭 컨텍스트 메뉴 (backdrop overlay 패턴) */}
          {ctxMenu && (() => {
            const c = summaryCards.find(x => x.id === ctxMenu.cardId);
            const idx = summaryCards.findIndex(x => x.id === ctxMenu.cardId);
            if (!c) return null;
            return (
              <>
                <div onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
                <div className="db2-ctxmenu" style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setEditingCardId(c.id); setCtxMenu(null); }}>✏ 이름 변경</button>
                <button onClick={() => { setIconPickerId(c.id); setCtxMenu(null); }}>🎨 아이콘 변경</button>
                <div className="db2-ctx-sep"></div>
                <button onClick={() => { const v = prompt("값 (숫자, 원 단위):", c.value); if (v !== null) { updateCard(c.id, { value: Number(v) || 0 }); } setCtxMenu(null); }}>💰 값 수정</button>
                {c.type === "asset" && <button onClick={() => { const t = prompt("목표 (숫자, 원 단위):", c.target); if (t !== null) { updateCard(c.id, { target: Number(t) || 0 }); } setCtxMenu(null); }}>🎯 목표 수정</button>}
                <button onClick={() => { updateCard(c.id, { type: c.type === "asset" ? "income" : "asset", target: c.target || 100000000 }); setCtxMenu(null); }}>🔄 타입 ({c.type === "asset" ? "자산→수입" : "수입→자산"})</button>
                <div className="db2-ctx-sep"></div>
                {idx > 0 && <button onClick={() => { moveCard(idx, -1); setCtxMenu(null); }}>⬅ 왼쪽으로</button>}
                {idx < summaryCards.length - 1 && <button onClick={() => { moveCard(idx, +1); setCtxMenu(null); }}>➡ 오른쪽으로</button>}
                <div className="db2-ctx-sep"></div>
                <button onClick={() => { deleteCard(c.id); setCtxMenu(null); }} style={{ color: "var(--red)" }}>🗑 삭제</button>
              </div>
              </>
            );
          })()}

        </div>
      );
    }

    /* ---------- TAB 4: Retro ---------- */
    function RetroTab({ retros, setRetros, tasks, dailyLog, goals }) {
      const [good, setGood] = useState("");
      const [bad, setBad] = useState("");
      const [improve, setImprove] = useState("");

      const saveRetro = () => {
        if (!good && !bad && !improve) return;
        const newRetro = {
          id: "r" + Date.now(),
          week: `W${getWeekNumber()} · ${new Date().getFullYear()}`,
          date: getWeekRange(0),
          good, bad, improve,
        };
        setRetros(prev => [newRetro, ...prev]);
        setGood(""); setBad(""); setImprove("");
      };

      return (
        <div className="panel-enter">
          <div className="section-head">
            <div>
              <div className="section-title">주간 회고</div>
              <div className="section-sub">이번주를 돌아보고 다음주를 준비하세요</div>
            </div>
            <button className="btn" onClick={saveRetro}>저장하기</button>
          </div>

          {/* 자동 요약 */}
          {(() => {
            const today = new Date();
            const dow = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
            const weekDates = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday); d.setDate(monday.getDate() + i);
              return d.toISOString().slice(0, 10);
            });
            const weekEntries = weekDates.map(k => dailyLog[k]).filter(Boolean);
            const completedThisWeek = tasks.filter(t => t.done).length;
            const avgRate = weekEntries.length > 0 ? Math.round(weekEntries.reduce((s, e) => s + e.rate, 0) / weekEntries.length) : 0;
            const activeDays = weekEntries.filter(e => e.rate > 0).length;
            const bestGoal = goals && goals.length > 0 ? goals.reduce((a, b) => a.progress > b.progress ? a : b) : null;
            return (
              <div className="retro-summary">
                <div className="retro-summary-title">
                  📊 이번 주 자동 요약 · W{getWeekNumber()} · {getWeekRange(0)}
                </div>
                <div className="retro-summary-grid">
                  <div className="retro-summary-item">
                    <div className="retro-summary-item-label">완료한 할 일</div>
                    <div className="retro-summary-item-value">{completedThisWeek}개</div>
                    <div className="retro-summary-item-sub">전체 {tasks.length}개 중</div>
                  </div>
                  <div className="retro-summary-item">
                    <div className="retro-summary-item-label">평균 달성률</div>
                    <div className="retro-summary-item-value">{avgRate}%</div>
                    <div className="retro-summary-item-sub">활동일 {activeDays}일</div>
                  </div>
                  <div className="retro-summary-item">
                    <div className="retro-summary-item-label">가장 진행된 목표</div>
                    <div className="retro-summary-item-value" style={{ fontSize: 13 }}>{bestGoal ? bestGoal.name : '—'}</div>
                    <div className="retro-summary-item-sub">{bestGoal ? `${bestGoal.progress}%` : ''}</div>
                  </div>
                  <div className="retro-summary-item">
                    <div className="retro-summary-item-label">이번 주 히트맵</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {weekDates.map((k, i) => {
                        const e = dailyLog[k]; const rate = e ? e.rate : -1;
                        const lv = rate < 0 ? '' : rate < 30 ? 'lv1' : rate < 60 ? 'lv2' : 'lv3';
                        return <div key={i} className={`heatmap-cell ${lv}`} style={{ width: 14, height: 14 }} />;
                      })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGood(`이번 주 ${completedThisWeek}개 태스크 완료${bestGoal ? `, ${bestGoal.name} 목표 ${bestGoal.progress}% 달성` : ''}`);
                    setBad(`활동일 ${activeDays}일 — ${7 - activeDays}일 공백 발생`);
                  }}
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 16px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
                  이 내용으로 회고 초안 채우기
                </button>
              </div>
            );
          })()}

          <div className="retro-editor">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>이번주 회고 · W{getWeekNumber()}</div>
              <div style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 12.5, color: "var(--text-3)" }}>{new Date().getFullYear()}.{getWeekRange(0)}</div>
            </div>
            <div className="retro-grid">
              <div className="retro-field">
                <div className="retro-field-label">
                  <span style={{ color: "var(--green)" }}>●</span> 잘한 것
                </div>
                <textarea className="retro-textarea" placeholder="이번주 잘 된 일, 성과, 뿌듯한 순간..." value={good} onChange={e => setGood(e.target.value)} />
              </div>
              <div className="retro-field">
                <div className="retro-field-label">
                  <span style={{ color: "var(--red)" }}>●</span> 아쉬운 것
                </div>
                <textarea className="retro-textarea" placeholder="미완료, 실수, 더 잘할 수 있었던 것..." value={bad} onChange={e => setBad(e.target.value)} />
              </div>
              <div className="retro-field">
                <div className="retro-field-label">
                  <span style={{ color: "var(--accent)" }}>●</span> 다음주 개선
                </div>
                <textarea className="retro-textarea" placeholder="다음주에 바꿀 행동 1~3가지..." value={improve} onChange={e => setImprove(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card-title" style={{ marginBottom: 14 }}><span className="dot-purple" />이전 회고 기록</div>
          <div className="retro-history">
            {retros.map((r) => (
              <div key={r.id} className="retro-card">
                <div className="retro-card-head">
                  <span className="retro-week-label">{r.week}</span>
                  <span style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 12, color: "var(--text-4)" }}>{r.date}</span>
                  <button onClick={() => setRetros(prev => prev.filter(x => x.id !== r.id))}
                    style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>×</button>
                </div>
                <div className="retro-cols">
                  <div>
                    <div className="retro-col-title">✓ 잘한 것</div>
                    <div className="retro-col-text">{r.good}</div>
                  </div>
                  <div>
                    <div className="retro-col-title">✗ 아쉬운 것</div>
                    <div className="retro-col-text">{r.bad}</div>
                  </div>
                  <div>
                    <div className="retro-col-title">→ 개선</div>
                    <div className="retro-col-text">{r.improve}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ---------- Radar Chart ---------- */
    function RadarChart({ stats, size = 200 }) {
      const cx = size / 2, cy = size / 2;
      const R = size * 0.36;
      const n = stats.length;
      const angles = Array.from({length: n}, (_, i) => (i * 2 * Math.PI / n) - Math.PI / 2);
      const pt = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const toPoints = pts => pts.map(p => p.join(',')).join(' ');
      const levels = [0.25, 0.5, 0.75, 1.0];
      const dataPts = stats.map((s, i) => pt(angles[i], (s.xp / 100) * R));
      const labelPts = angles.map((a, i) => pt(a, R + 24));
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {levels.map((l, li) => (
            <polygon key={li} points={toPoints(angles.map(a => pt(a, R * l)))}
              fill="none"
              stroke={li === 3 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}
              strokeWidth={li === 3 ? 1.5 : 1} />
          ))}
          {angles.map((a, i) => {
            const [x, y] = pt(a, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>;
          })}
          <polygon points={toPoints(dataPts)}
            fill="rgba(139,92,246,0.18)" stroke="rgba(139,92,246,0.8)"
            strokeWidth="2" strokeLinejoin="round" />
          {dataPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill="#8b5cf6" stroke="var(--bg-1)" strokeWidth="2"/>
          ))}
          {labelPts.map(([x, y], i) => (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="15" style={{userSelect:'none'}}>
              {stats[i].icon}
            </text>
          ))}
        </svg>
      );
    }

    /* ---------- TAB 5: Vision ---------- */
    function VisionTab({ vision, setVision, stats, setStats, dreams, setDreams, initialOpenDreamId, onDreamOpened, uid, settings, setSettings }) {
      const [expandedStat, setExpandedStat] = useState(null);
      const [expandedDream, setExpandedDream] = useState(null);
      const [editingDream, setEditingDream] = useState(null);
      const [confirmDeleteId, setConfirmDeleteId] = useState(null);
      useEffect(() => {
        if (initialOpenDreamId) {
          setExpandedDream(initialOpenDreamId);
          // 스크롤 이동
          setTimeout(() => {
            const el = document.getElementById("dream-" + initialOpenDreamId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
          onDreamOpened && onDreamOpened();
        }
      }, [initialOpenDreamId]);

      const updateStat = (id, rawVal) => {
        const num = Number(rawVal) || 0;
        const thresholds = { work: 100, finance: 1000, health: 20, content: 1000, mental: 12 };
        setStats(prev => prev.map(s => {
          if (s.id !== id) return s;
          const xp = Math.min(100, Math.round((num / (thresholds[s.id] || 100)) * 100));
          const level = Math.max(1, Math.min(10, Math.floor(xp / 20) + 1));
          return { ...s, value: num, xp, level };
        }));
      };

      const updateDream = (id, field, value) =>
        setDreams(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

      const updateCalc = (id, key, value) =>
        setDreams(prev => prev.map(d => d.id === id ? { ...d, calc: { ...d.calc, [key]: Number(value) || 0 } } : d));

      const addDream = () => {
        const id = "d" + Date.now();
        setDreams(prev => [...prev, { id, name: "새 드림", emoji: "⭐", targetAmount: 10000, currentAmount: 0, unit: "만원", imgUrl: "", calc: { monthlySavings: 100, targetYears: 5 } }]);
        setExpandedDream(id);
      };

      const calcTime = (needed, monthly) => {
        if (monthly <= 0 || needed <= 0) return null;
        const total = Math.ceil(needed / monthly);
        const gy = 2026 + Math.floor((5 + total) / 12);
        const gm = ((5 + total) % 12) + 1;
        return { y: Math.floor(total / 12), m: total % 12, gy, gm };
      };

      return (
        <div className="panel-enter">
          <div className="section-head vision-head-inline">
            <div>
              <div className="section-title">비전 & 성장</div>
              <div className="section-sub">나의 큰 그림과 현재 레벨을 한눈에</div>
            </div>
            <div className="vision-mission-box">
              <input className="vision-mission-input-center" value={vision.mission}
                onChange={e => setVision(v => ({ ...v, mission: e.target.value }))}
                placeholder="내가 이 모든 것을 하는 이유는..."
                style={{ fontSize: ((settings?.missionTextSize >= 14 && settings?.missionTextSize <= 50) ? settings.missionTextSize : 18) + "px" }} />
              <div className="mission-size-slider">
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>🔍</span>
                <input type="range" min="14" max="50" step="1"
                  value={(settings?.missionTextSize >= 14 && settings?.missionTextSize <= 50) ? settings.missionTextSize : 18}
                  onChange={(e) => setSettings(p => ({ ...p, missionTextSize: Number(e.target.value) }))} />
                <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--accent)", minWidth: 36, textAlign: "right" }}>{(settings?.missionTextSize >= 14 && settings?.missionTextSize <= 50) ? settings.missionTextSize : 18}px</span>
              </div>
            </div>
          </div>

          {/* Dream Board — 사명 바로 아래 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div className="card-title"><span className="dot-purple"/>드림 보드</div>
            <button className="btn btn-ghost" style={{ fontSize: 13, padding:"6px 12px" }} onClick={addDream}>+ 추가</button>
          </div>
          <div className="dream-grid">
            {dreams.map(d => {
              const pct = d.targetAmount > 0 ? Math.min(100, Math.round((d.currentAmount / d.targetAmount) * 100)) : 0;
              const blur = ((1 - pct / 100) * 20).toFixed(1);
              const gray = Math.round((1 - pct / 100) * 100);
              const needed = Math.max(0, d.targetAmount - d.currentAmount);
              const ms = d.calc?.monthlySavings || 0;
              const ty = d.calc?.targetYears || 5;
              const timeResult = calcTime(needed, ms);
              const reqMonthly = ty > 0 ? Math.ceil(needed / (ty * 12)) : 0;
              const isOpen = expandedDream === d.id;

              return (
                <div key={d.id} id={"dream-" + d.id} className={"dream-card" + (isOpen ? " dream-open" : "")}>
                  <div className="dream-img-wrap" onClick={() => setExpandedDream(isOpen ? null : d.id)}>
                    {d.imgUrl ? (
                      <img src={d.imgUrl} className="dream-img" alt="" />
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                        <span style={{ fontSize: 33 }}>{d.emoji || "⭐"}</span>
                        <span style={{ fontSize: 12, color:"var(--text-4)" }}>이미지 URL 입력</span>
                      </div>
                    )}
                    <div className="dream-img-overlay">
                      <span className="dream-pct-badge">{pct}%</span>
                    </div>
                  </div>

                  <div className="dream-card-body" onClick={() => setExpandedDream(isOpen ? null : d.id)}>
                    <div className="dream-card-name">{d.name}</div>
                    <div className="dream-card-meta">
                      <span>{d.currentAmount.toLocaleString()} / {d.targetAmount.toLocaleString()} {d.unit}</span>
                      <span style={{ color: pct >= 100 ? "var(--green)" : "var(--text-4)" }}>{pct >= 100 ? "✓ 달성" : "진행중"}</span>
                    </div>
                    <div className="mini-bar" style={{ marginTop:8 }}>
                      <div className="mini-bar-fill" style={{ width:`${pct}%` }}/>
                    </div>
                  </div>

                  {isOpen && (() => {
                    const isEdit = editingDream === d.id;
                    const tier = d.tier || inferDreamTier(d);
                    const tierLabel = { legend: "👑 LEGEND · +5,000 XP", epic: "💜 EPIC · +2,500 XP", rare: "💎 RARE · +1,000 XP", normal: "⚪ NORMAL · +400 XP" }[tier];
                    return (
                      <div className="dream-expand">
                        {!isEdit ? (
                          /* ── 뷰 모드 ── */
                          <div className="dream-view">
                            <div className="dream-view-name">{d.name}</div>
                            <div className="dream-view-tier">{tierLabel}</div>

                            <div className="dream-view-amounts">
                              <div className="dva-item">
                                <div className="dva-label">현재 자산</div>
                                <div className="dva-val">{fmtManwon(d.currentAmount)}</div>
                              </div>
                              <div className="dva-arrow">→</div>
                              <div className="dva-item">
                                <div className="dva-label">목표 금액</div>
                                <div className="dva-val accent">{fmtManwon(d.targetAmount)}</div>
                              </div>
                              <div className="dva-arrow"></div>
                              <div className="dva-item">
                                <div className="dva-label">남은 금액</div>
                                <div className="dva-val">{fmtManwon(needed)}</div>
                              </div>
                            </div>

                            <div className="dream-view-prog">
                              <div className="dvp-bar"><div style={{ width: pct + "%" }} /></div>
                              <span className="dvp-pct">{pct}%</span>
                            </div>

                            <div className="dream-calc-grid">
                              <div className="dream-calc-box">
                                <div className="dream-calc-title">📊 월 저축 {ms.toLocaleString()}만원 → </div>
                                {needed <= 0 ? (
                                  <div className="dream-calc-result"><span className="dream-calc-big" style={{color:"var(--green)"}}>이미 달성! 🎉</span></div>
                                ) : timeResult ? (
                                  <div className="dream-calc-result">
                                    <span className="dream-calc-big">{timeResult.y > 0 ? timeResult.y + "년 " : ""}{timeResult.m}개월 후</span>
                                    <span className="dream-calc-sub">{timeResult.gy}년 {timeResult.gm}월 달성 예상</span>
                                  </div>
                                ) : (
                                  <div className="dream-calc-result"><span className="dream-calc-sub" style={{color:"var(--red)"}}>월 저축액 미입력</span></div>
                                )}
                              </div>
                              <div className="dream-calc-box">
                                <div className="dream-calc-title">📅 {ty}년 안에 달성하려면</div>
                                {needed <= 0 ? (
                                  <div className="dream-calc-result"><span className="dream-calc-big" style={{color:"var(--green)"}}>이미 달성! 🎉</span></div>
                                ) : (
                                  <div className="dream-calc-result">
                                    <span className="dream-calc-big">월 {reqMonthly.toLocaleString()}만원</span>
                                    <span className="dream-calc-sub">필요 월 저축액</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="dream-actions">
                              <button className="dream-act-btn save" onClick={() => setEditingDream(d.id)}>✏️ 수정</button>
                              <button className="dream-act-btn del" onClick={() => setConfirmDeleteId(d.id)}>🗑 삭제</button>
                            </div>
                          </div>
                        ) : (
                          /* ── 편집 모드 ── */
                          <div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                              <div className="dream-input-row">
                                <label>이름</label>
                                <input className="char-input" style={{ flex: 1, textAlign: "left" }} value={d.name}
                                  onChange={e => updateDream(d.id, "name", e.target.value)} />
                              </div>
                              <div className="dream-input-row">
                                <label>목표 금액</label>
                                <input className="char-input dream-amount-input" type="number" value={d.targetAmount}
                                  onChange={e => updateDream(d.id, "targetAmount", Number(e.target.value) || 0)} />
                                <span className="dream-unit">만원</span>
                                <span className="dream-fmt-hint">→ {fmtManwon(d.targetAmount)}</span>
                              </div>
                              <div className="dream-input-row">
                                <label>현재 자산</label>
                                <input className="char-input dream-amount-input" type="number" value={d.currentAmount}
                                  onChange={e => updateDream(d.id, "currentAmount", Number(e.target.value) || 0)} />
                                <span className="dream-unit">만원</span>
                                <span className="dream-fmt-hint">→ {fmtManwon(d.currentAmount)}</span>
                              </div>
                              <div className="dream-input-row">
                                <label>티어</label>
                                <select className="char-input" style={{ flex: 1, textAlign: "left", fontSize: 13 }} value={tier} onChange={e => updateDream(d.id, "tier", e.target.value)}>
                                  <option value="legend">👑 Legend · +5,000 XP</option>
                                  <option value="epic">💜 Epic · +2,500 XP</option>
                                  <option value="rare">💎 Rare · +1,000 XP</option>
                                  <option value="normal">⚪ Normal · +400 XP</option>
                                </select>
                              </div>
                              <div className="dream-input-row">
                                <label>이미지 URL</label>
                                <input className="char-input" style={{ flex: 1, textAlign: "left", fontSize: 12 }} value={d.imgUrl}
                                  onChange={e => updateDream(d.id, "imgUrl", e.target.value)} placeholder="https://... 또는 아래 버튼" />
                              </div>
                              <DreamImageActions dream={d} updateDream={updateDream} uid={uid} />
                            </div>

                            <div className="dream-calc-grid">
                              <div className="dream-calc-box">
                                <div className="dream-calc-title">📊 이렇게 모으면</div>
                                <div className="dream-slider-row">
                                  <span className="dream-slider-label">월 저축</span>
                                  <input type="range" className="dream-slider" min="10" max="5000" step="10" value={ms}
                                    onChange={e => updateCalc(d.id, "monthlySavings", e.target.value)} />
                                  <input className="char-input dream-num-input" type="number" value={ms}
                                    onChange={e => updateCalc(d.id, "monthlySavings", e.target.value)} />
                                  <span className="dream-unit">만원</span>
                                </div>
                                {needed <= 0 ? (
                                  <div className="dream-calc-result"><span className="dream-calc-big" style={{color:"var(--green)"}}>이미 달성! 🎉</span></div>
                                ) : timeResult ? (
                                  <div className="dream-calc-result">
                                    <span className="dream-calc-big">{timeResult.y > 0 ? timeResult.y + "년 " : ""}{timeResult.m}개월 후</span>
                                    <span className="dream-calc-sub">{timeResult.gy}년 {timeResult.gm}월 달성 예상</span>
                                  </div>
                                ) : (
                                  <div className="dream-calc-result"><span className="dream-calc-sub" style={{color:"var(--red)"}}>월 저축액을 입력하세요</span></div>
                                )}
                              </div>

                              <div className="dream-calc-box">
                                <div className="dream-calc-title">📅 기간으로 역산</div>
                                <div className="dream-slider-row">
                                  <span className="dream-slider-label">목표 기간</span>
                                  <input type="range" className="dream-slider" min="1" max="30" step="1" value={ty}
                                    onChange={e => updateCalc(d.id, "targetYears", e.target.value)} />
                                  <input className="char-input dream-num-input" type="number" value={ty}
                                    onChange={e => updateCalc(d.id, "targetYears", e.target.value)} />
                                  <span className="dream-unit">년</span>
                                </div>
                                {needed <= 0 ? (
                                  <div className="dream-calc-result"><span className="dream-calc-big" style={{color:"var(--green)"}}>이미 달성! 🎉</span></div>
                                ) : (
                                  <div className="dream-calc-result">
                                    <span className="dream-calc-big">월 {reqMonthly.toLocaleString()}만원</span>
                                    <span className="dream-calc-sub">필요 월 저축액</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="dream-actions">
                              <button className="dream-act-btn save" onClick={() => setEditingDream(null)}>✓ 저장</button>
                              <button className="dream-act-btn del" onClick={() => setConfirmDeleteId(d.id)}>🗑 삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* 드림 삭제 확인 모달 */}
          {confirmDeleteId && (() => {
            const target = dreams.find(x => x.id === confirmDeleteId);
            if (!target) return null;
            return (
              <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                <div className="modal-box" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-head">
                    <div className="modal-title">🗑 드림 삭제 확인</div>
                    <button className="modal-close" onClick={() => setConfirmDeleteId(null)}>×</button>
                  </div>
                  <div className="modal-body">
                    <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>
                      <strong style={{ color: "var(--text-1)", fontSize: 15 }}>"{target.name}"</strong> 드림을 정말 삭제하시겠어요?<br />
                      <span style={{ color: "var(--text-4)", fontSize: 12 }}>삭제 후 복구 불가합니다.</span>
                    </div>
                  </div>
                  <div className="modal-foot">
                    <button className="btn-cancel" onClick={() => setConfirmDeleteId(null)}>취소</button>
                    <button onClick={() => { setDreams(prev => prev.filter(x => x.id !== confirmDeleteId)); setConfirmDeleteId(null); setExpandedDream(null); setEditingDream(null); }}
                      style={{ background: "var(--red)", border: "none", color: "#fff", padding: "7px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Geist, sans-serif" }}>
                      🗑 삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="big-timeline" style={{ "--bigt-scale": ((settings?.bigtTextSize >= 10 && settings?.bigtTextSize <= 22) ? settings.bigtTextSize : 13) / 13 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div className="card-title" style={{ marginBottom: 0 }}><span className="dot-purple"/>큰 계획 타임라인</div>
              <div className="bigt-text-size">
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>🔍</span>
                <input type="range" min="10" max="22" step="1"
                  value={(settings?.bigtTextSize >= 10 && settings?.bigtTextSize <= 22) ? settings.bigtTextSize : 13}
                  onChange={(e) => setSettings(p => ({ ...p, bigtTextSize: Number(e.target.value) }))} />
                <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--accent)", minWidth: 36, textAlign: "right" }}>{(settings?.bigtTextSize >= 10 && settings?.bigtTextSize <= 22) ? settings.bigtTextSize : 13}px</span>
              </div>
            </div>
            <div className="bigt-track">
              {vision.timeline.map(yr => (
                <div key={yr.year} className={"bigt-year" + (yr.current ? " current" : "")}>
                  <div className="bigt-year-label">
                    <span className="bigt-ydot" />{yr.year}
                    {yr.current && <span style={{ fontSize: 10.5, color:"var(--accent)", fontFamily:"Geist Mono, ui-monospace, monospace" }}>NOW</span>}
                  </div>
                  <div className="bigt-items">
                    {yr.items.map((it, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div className={"bigt-item " + it.state} style={{ flex:1 }}>{it.text}</div>
                        <button onClick={() => setVision(v => ({ ...v, timeline: v.timeline.map(y => y.year === yr.year ? { ...y, items: y.items.filter((_, idx) => idx !== i) } : y) }))}
                          style={{ background:"transparent", border:"none", color:"var(--text-4)", cursor:"pointer", fontSize: 13, padding:"1px 5px", flexShrink:0 }}>×</button>
                      </div>
                    ))}
                    <input
                      placeholder="+ 항목 추가 (Enter)"
                      style={{ marginTop:6, background:"var(--bg-3)", border:"1px solid var(--border)", borderRadius:5, color:"var(--text-2)", fontSize: 12, padding:"4px 8px", fontFamily:"Geist, sans-serif", width:"100%" }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          const text = e.target.value.trim();
                          setVision(v => ({ ...v, timeline: v.timeline.map(y => y.year === yr.year ? { ...y, items: [...y.items, { text, state: yr.current ? "active" : "future" }] } : y) }));
                          e.target.value = "";
                        }
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    /* ---------- Focus Mode ---------- */
    function FocusMode({ tasks, topThree, toggleTask, onClose }) {
      const items = topThree.filter(t => t.text).concat(
        tasks.filter(t => !t.done && !topThree.some(tt => tt.text === t.text))
      ).slice(0, 8);
      const [idx, setIdx] = useState(0);
      const [running, setRunning] = useState(false);
      const [seconds, setSeconds] = useState(25 * 60);
      const [completed, setCompleted] = useState({}); // {idx: true} — 명시적 완료 체크
      const timerRef = useRef(null);

      useEffect(() => {
        if (running) {
          timerRef.current = setInterval(() => {
            setSeconds(s => {
              if (s <= 1) { clearInterval(timerRef.current); setRunning(false); return 25 * 60; }
              return s - 1;
            });
          }, 1000);
        } else {
          clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
      }, [running]);

      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      const current = items[idx];
      const isCurDone = !!completed[idx];

      const markDone = () => {
        if (!current) return;
        setCompleted(prev => ({ ...prev, [idx]: !prev[idx] }));
        // 실제 task에도 반영
        if (!isCurDone && current.id) toggleTask(current.id);
      };

      return (
        <div className="focus-overlay">
          <button className="focus-exit" onClick={onClose}>✕</button>
          <div className="focus-context">
            집중 모드 · {idx + 1} / {items.length}
            {isCurDone && <span style={{ color: 'var(--green)', marginLeft: 10 }}>✓ 완료</span>}
          </div>
          <div className="focus-task-box">
            <div className="focus-task-text" style={{ textDecoration: isCurDone ? 'line-through' : 'none', color: isCurDone ? 'var(--text-4)' : 'inherit' }}>
              {current ? current.text : "할 일이 없습니다"}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="focus-timer">{mm}:{ss}</div>
            <div className="focus-timer-label">포모도로 타이머</div>
          </div>
          <div className="focus-btns">
            <button className="focus-btn" onClick={() => setIdx(i => Math.max(0, i - 1))}>← 이전</button>
            <button className="focus-btn primary" onClick={() => setRunning(r => !r)}>
              {running ? "⏸ 일시정지" : "▶ 시작"}
            </button>
            <button
              className="focus-btn"
              style={{ background: isCurDone ? 'var(--green)' : 'var(--bg-2)', borderColor: isCurDone ? 'var(--green)' : 'var(--border)', color: isCurDone ? '#fff' : 'var(--text-2)', fontWeight: isCurDone ? 600 : 400 }}
              onClick={markDone}
            >
              {isCurDone ? "✓ 완료됨" : "☑ 완료"}
            </button>
            <button className="focus-btn" onClick={() => { setSeconds(25*60); setRunning(false); }}>↺ 초기화</button>
            <button className="focus-btn" onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))}>다음 →</button>
          </div>
          <div className="focus-progress">
            {items.map((it, i) => (
              <div key={i} className={"focus-dot" + (completed[i] ? " done" : i === idx ? " active" : "")} title={it.text} />
            ))}
          </div>
        </div>
      );
    }

    /* ---------- TAB 2: Goals ---------- */
    function GoalsTab({ goals, setGoals, addGoal, editGoal, deleteGoal }) {
      const [openId, setOpenId] = useState("g1");
      const [editingId, setEditingId] = useState(null);
      const [showAddForm, setShowAddForm] = useState(false);
      const [editForm, setEditForm] = useState({});
      const [newForm, setNewForm] = useState({ name: "", category: "", progress: 0, deadline: "", milestoneName: "", milestoneKpi: "" });

      const startEdit = (g) => {
        setEditingId(g.id);
        const active = g.milestones.find(m => m.status === "active") || g.milestones[0] || {};
        setEditForm({
          name: g.name,
          category: g.category,
          progress: g.progress,
          deadline: g.deadline,
          milestoneName: active.name || "",
          milestoneKpi: active.kpi ? active.kpi.label : "",
        });
      };

      const saveEdit = (g) => {
        const updatedMilestones = g.milestones.map(m => {
          if (m.status === "active") {
            return {
              ...m,
              name: editForm.milestoneName || m.name,
              kpi: editForm.milestoneKpi ? { ...m.kpi, label: editForm.milestoneKpi } : m.kpi,
            };
          }
          return m;
        });
        editGoal(g.id, {
          name: editForm.name,
          category: editForm.category,
          progress: Number(editForm.progress),
          deadline: editForm.deadline,
          milestones: updatedMilestones,
        });
        setEditingId(null);
      };

      const handleAddGoal = () => {
        if (!newForm.name.trim()) return;
        const goal = {
          id: "g" + Date.now(),
          name: newForm.name.trim(),
          category: newForm.category.trim() || "기타",
          progress: Number(newForm.progress),
          deadline: newForm.deadline || "2026-12-31",
          milestones: newForm.milestoneName.trim() ? [{
            id: "m" + Date.now(),
            name: newForm.milestoneName.trim(),
            status: "active",
            kpi: newForm.milestoneKpi.trim() ? { label: newForm.milestoneKpi.trim(), current: 0, target: 100, unit: "" } : null,
          }] : [],
        };
        addGoal(goal);
        setNewForm({ name: "", category: "", progress: 0, deadline: "", milestoneName: "", milestoneKpi: "" });
        setShowAddForm(false);
      };

      return (
        <div className="panel-enter">
          <div className="section-head">
            <div>
              <div className="section-title">목표 & 단계</div>
              <div className="section-sub">{goals.length}개의 활성 목표 · 각 카드를 클릭해서 단계별 진행 상황을 펼쳐보세요</div>
            </div>
            <button className="btn" onClick={() => setShowAddForm(v => !v)}><span style={{fontSize: 15}}>+</span>새 목표 추가</button>
          </div>

          {showAddForm && (
            <div className="edit-form" style={{ marginBottom: 16 }}>
              <div className="edit-form-row">
                <div><label>목표명</label><input value={newForm.name} onChange={e => setNewForm(p => ({...p, name: e.target.value}))} placeholder="목표 이름" /></div>
                <div><label>카테고리</label><input value={newForm.category} onChange={e => setNewForm(p => ({...p, category: e.target.value}))} placeholder="예: 사업, 건강" /></div>
              </div>
              <div className="edit-form-row">
                <div><label>진행률 {newForm.progress}%</label><input type="range" min="0" max="100" value={newForm.progress} onChange={e => setNewForm(p => ({...p, progress: e.target.value}))} /></div>
                <div><label>마감기한</label><input type="date" value={newForm.deadline} onChange={e => setNewForm(p => ({...p, deadline: e.target.value}))} /></div>
              </div>
              <div className="edit-form-row">
                <div><label>현재 단계명</label><input value={newForm.milestoneName} onChange={e => setNewForm(p => ({...p, milestoneName: e.target.value}))} placeholder="예: 1단계 시장 조사" /></div>
                <div><label>KPI</label><input value={newForm.milestoneKpi} onChange={e => setNewForm(p => ({...p, milestoneKpi: e.target.value}))} placeholder="예: 구독자 수" /></div>
              </div>
              <div className="edit-btns">
                <button className="btn-cancel" onClick={() => setShowAddForm(false)}>취소</button>
                <button className="btn-save" onClick={handleAddGoal}>추가</button>
              </div>
            </div>
          )}

          <div className="goal-row-list">
            {goals.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-4)", fontSize: 14 }}>목표가 없습니다</div>
            )}
            {goals.map((g) => {
              const open = openId === g.id;
              const isEditing = editingId === g.id;
              const dday = calcDday(g.deadline);
              return (
                <div key={g.id} className={"goal-expand" + (open ? " open" : "")}>
                  <div
                    className="goal-expand-head"
                    onClick={() => !isEditing && setOpenId(open ? null : g.id)}
                  >
                    <ChevronIcon />
                    <div className="goal-expand-meta">
                      <div className="goal-expand-cat">{g.category}</div>
                      <div className="goal-expand-name">{g.name}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 12.5 }}>
                      <span style={{ color: dday <= 30 ? "var(--red)" : dday <= 90 ? "var(--amber)" : "var(--accent)", fontWeight: 600 }}>D-{dday}</span>
                      <span style={{ color: "var(--text-4)" }}>·</span>
                      <span style={{ color: "var(--text-3)" }}>{fmtDeadline(g.deadline)}</span>
                    </div>
                    <div className="goal-expand-counter">
                      {g.milestones.filter(m => m.status === "done").length}/{g.milestones.length} 단계
                    </div>
                    <div className="goal-expand-progress">
                      <div className="bar"><div className="bar-fill" style={{ width: `${g.progress}%` }} /></div>
                      <span className="pct-num">{g.progress}%</span>
                    </div>
                    <RingChart value={g.progress} size={42} stroke={4} />
                    <button className="icon-edit" onClick={e => { e.stopPropagation(); startEdit(g); }}>✏️</button>
                    <button className="btn-del" onClick={e => { e.stopPropagation(); deleteGoal(g.id); }}>🗑</button>
                  </div>

                  {isEditing && (
                    <div className="edit-form" style={{ margin: "0 18px 16px" }}>
                      <div className="edit-form-row">
                        <div><label>목표명</label><input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} /></div>
                        <div><label>카테고리</label><input value={editForm.category} onChange={e => setEditForm(p => ({...p, category: e.target.value}))} /></div>
                      </div>
                      <div className="edit-form-row">
                        <div><label>진행률 {editForm.progress}%</label><input type="range" min="0" max="100" value={editForm.progress} onChange={e => setEditForm(p => ({...p, progress: e.target.value}))} /></div>
                        <div><label>마감기한</label><input type="date" value={editForm.deadline} onChange={e => setEditForm(p => ({...p, deadline: e.target.value}))} /></div>
                      </div>
                      <div className="edit-form-row">
                        <div><label>현재 단계명</label><input value={editForm.milestoneName} onChange={e => setEditForm(p => ({...p, milestoneName: e.target.value}))} /></div>
                        <div><label>KPI</label><input value={editForm.milestoneKpi} onChange={e => setEditForm(p => ({...p, milestoneKpi: e.target.value}))} /></div>
                      </div>
                      <div className="edit-btns">
                        <button className="btn-cancel" onClick={() => setEditingId(null)}>취소</button>
                        <button className="btn-save" onClick={() => saveEdit(g)}>저장</button>
                      </div>
                    </div>
                  )}

                  <div className="goal-expand-body">
                    <div className="timeline">
                      <div className="timeline-track" />
                      {g.milestones.map((m, idx) => (
                        <div key={m.id} className={"ts-item " + m.status}>
                          <div className="ts-node" />
                          <div className="ts-row">
                            <div className="ts-title">
                              <span style={{ fontFamily: "Geist Mono, ui-monospace, monospace", color: "var(--text-4)", marginRight: 8, fontSize: 12.5 }}>
                                {idx + 1}단계
                              </span>
                              {m.name}
                            </div>
                            <span className={"ts-badge " + m.status}>
                              {m.status === "done" ? "완료" : m.status === "active" ? "진행중" : "예정"}
                            </span>
                          </div>
                          {m.kpi && (
                            <div className="kpi-block">
                              <div className="kpi-row">
                                <span className="kpi-label">{m.kpi.label}</span>
                                <span className="kpi-value">
                                  {m.kpi.current.toLocaleString()}<span className="target"> / {m.kpi.target.toLocaleString()} {m.kpi.unit}</span>
                                </span>
                              </div>
                              <div className="kpi-bar">
                                <div
                                  className="kpi-bar-fill"
                                  style={{ width: `${Math.min(100, (m.kpi.current / m.kpi.target) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    /* ---------- TAB 3: Tasks ---------- */
    function Calendar({ tasks }) {
      const [current, setCurrent] = useState(() => {
        const n = new Date();
        return { year: n.getFullYear(), month: n.getMonth() + 1 };
      });
      const today = new Date();
      const isToday = (d) => today.getFullYear() === current.year && today.getMonth() + 1 === current.month && today.getDate() === d;
      const isInWeek = (d) => {
        const day = new Date(current.year, current.month - 1, d);
        const dow = day.getDay();
        const monday = new Date(day);
        monday.setDate(d - (dow === 0 ? 6 : dow - 1));
        const todayMonday = new Date(today);
        const todayDow = today.getDay();
        todayMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
        return monday.toDateString() === todayMonday.toDateString();
      };
      const taskDates = tasks ? tasks.map(t => t.date).filter(Boolean) : [];
      const hasEvent = (d) => {
        const ds = `${current.year}-${String(current.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        return taskDates.includes(ds);
      };
      const firstDay = new Date(current.year, current.month - 1, 1).getDay();
      const daysInMonth = new Date(current.year, current.month, 0).getDate();
      const startOffset = firstDay === 0 ? 6 : firstDay - 1;
      const cells = [];
      for (let i = 0; i < startOffset; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(d);
      const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
      const prevMonth = () => setCurrent(p => p.month === 1 ? { year: p.year-1, month: 12 } : { ...p, month: p.month-1 });
      const nextMonth = () => setCurrent(p => p.month === 12 ? { year: p.year+1, month: 1 } : { ...p, month: p.month+1 });
      return (
        <div className="card card-pad cal-card">
          <div className="cal-header">
            <button className="cal-nav" onClick={prevMonth}>‹</button>
            <span className="cal-month">{current.year}. {MONTHS[current.month-1]}</span>
            <button className="cal-nav" onClick={nextMonth}>›</button>
          </div>
          <div className="cal-grid">
            {["월","화","수","목","금","토","일"].map(d => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d, i) => (
              <div key={i} className={["cal-cell", d && isToday(d) ? "today" : "", d && isInWeek(d) ? "in-week" : "", d && hasEvent(d) ? "has-event" : ""].filter(Boolean).join(" ")}>
                {d || ""}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 14, fontSize: 12, color: "var(--text-3)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}/> 오늘
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(139,92,246,0.15)" }}/> 이번 주
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--accent)" }}/> 일정 있음
            </span>
          </div>
        </div>
      );
    }

    function TasksTab({ tasks, toggleTask, addTask, editTask, deleteTask }) {
      const [filter, setFilter] = useState("all");
      const tags = ["all", ...new Set(tasks.map(t => t.tag).filter(Boolean))];
      const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.tag === filter);
      const [showAddForm, setShowAddForm] = useState(false);
      const [newText, setNewText] = useState("");
      const [newQuadrant, setNewQuadrant] = useState("Q1");
      const [newTag, setNewTag] = useState("기타");
      const [editingId, setEditingId] = useState(null);
      const [editText, setEditText] = useState("");

      const handleAddTask = () => {
        if (!newText.trim()) return;
        addTask({ id: "t" + Date.now(), text: newText.trim(), quadrant: newQuadrant, tag: newTag, done: false, time: "" });
        setNewText(""); setNewQuadrant("Q1"); setNewTag("기타");
        setShowAddForm(false);
      };

      const startEditTask = (t) => { setEditingId(t.id); setEditText(t.text); };
      const saveEditTask = (id) => { editTask(id, { text: editText }); setEditingId(null); };

      return (
        <div className="panel-enter">
          <div className="section-head">
            <div>
              <div className="section-title">업무 관리</div>
              <div className="section-sub">월간 일정 · 이번주 4분면 · 오늘의 디테일</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {tags.map(tag => (
                  <button key={tag} onClick={() => setFilter(tag)}
                    style={{ background: filter === tag ? "var(--accent)" : "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: filter === tag ? "#fff" : "var(--text-3)", fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "Geist, sans-serif" }}>
                    {tag === "all" ? "전체" : tag}
                  </button>
                ))}
              </div>
              <button className="btn" onClick={() => setShowAddForm(v => !v)}><span style={{fontSize: 15}}>+</span>태스크 추가</button>
            </div>
          </div>

          {showAddForm && (
            <div className="edit-form" style={{ marginBottom: 16 }}>
              <div><label>할일</label><input value={newText} onChange={e => setNewText(e.target.value)} placeholder="태스크 내용을 입력하세요" onKeyDown={e => e.key === "Enter" && handleAddTask()} autoFocus /></div>
              <div className="edit-form-row">
                <div>
                  <label>4분면</label>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {["Q1","Q2","Q3","Q4"].map(q => (
                      <button key={q} onClick={() => setNewQuadrant(q)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: newQuadrant === q ? "1px solid var(--accent)" : "1px solid var(--border)", background: newQuadrant === q ? "var(--accent-soft)" : "var(--bg-3)", color: newQuadrant === q ? "var(--accent)" : "var(--text-3)", cursor: "pointer", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600 }}>{q}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label>태그</label>
                  <select value={newTag} onChange={e => setNewTag(e.target.value)} style={{ marginTop: 4 }}>
                    {["유튜브","부동산","NoteUp","개인","기타"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="edit-btns">
                <button className="btn-cancel" onClick={() => setShowAddForm(false)}>취소</button>
                <button className="btn-save" onClick={handleAddTask}>추가</button>
              </div>
            </div>
          )}

          <div className="tasks-grid">
            <Calendar tasks={tasks} />

            <div className="card card-pad" style={{ display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div className="card-title"><span className="dot-purple"/>이번주 4분면 · Eisenhower</div>
                <span style={{ fontSize: 12.5, color: "var(--text-3)", fontFamily: "Geist Mono, ui-monospace, monospace" }}>
                  {`W${getWeekNumber()}`} · {tasks.length} tasks
                </span>
              </div>
              <div className="eisen-full" style={{ flex: 1 }}>
                {QUADRANTS.map((q) => {
                  const qTasks = filteredTasks.filter(t => t.quadrant === q.id);
                  return (
                    <div key={q.id} className="eisen-quad">
                      <div className="eq-head">
                        <div>
                          <div className="eq-title"><span className={"qd "+q.dot}/>{q.num} · {q.title}</div>
                          <div className="eq-sub">{q.sub}</div>
                        </div>
                        <span className="quad-count">{qTasks.length}</span>
                      </div>
                      <div className="eq-tasks">
                        {qTasks.length === 0 && <div className="eq-empty">— 없음</div>}
                        {qTasks.map(t => (
                          <div key={t.id} className="eq-task">
                            <span className={"eq-dot " + (DOT_COLORS[t.tag] || "dot-gray")} />
                            <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-4)" : "inherit", flex: 1 }}>
                              {t.text.length > 28 ? t.text.slice(0,28) + "…" : t.text}
                            </span>
                            <span className="eq-tag-mini">{t.tag}</span>
                            <button className="icon-edit" onClick={e => { e.stopPropagation(); startEditTask(t); }}>✏</button>
                            <button className="btn-del" onClick={e => { e.stopPropagation(); deleteTask(t.id); }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card today-detail">
            <div className="card-header">
              <div className="card-title"><span className="dot-purple"/>오늘 할 일 · 상세</div>
              <span style={{ fontSize: 12.5, color: "var(--text-3)", fontFamily: "Geist Mono, ui-monospace, monospace" }}>
                {filteredTasks.filter(t => t.done).length}/{filteredTasks.length} 완료 · {`${new Date().getMonth()+1}월 ${new Date().getDate()}일`}
              </span>
            </div>
            <div className="today-rows">
              {filteredTasks.map(t => {
                const q = QUADRANTS.find(q => q.id === t.quadrant);
                return (
                  <div
                    key={t.id}
                    className={"today-row" + (t.done ? " done" : "")}
                    onClick={() => toggleTask(t.id)}
                  >
                    <div className="check-box" />
                    {editingId === t.id ? (
                      <input
                        className="today-text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditTask(t.id); if (e.key === "Escape") setEditingId(null); }}
                        onBlur={() => saveEditTask(t.id)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        style={{ background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--text-1)", padding: "2px 6px", fontFamily: "Geist, sans-serif", fontSize: 14 }}
                      />
                    ) : (
                      <div className="today-text">{t.text}</div>
                    )}
                    <div className="today-quad-tag">
                      <span className={"qd "+q.dot} />
                      {q.num}
                    </div>
                    <div className="today-time">{t.time}</div>
                    <button className="icon-edit" onClick={e => { e.stopPropagation(); startEditTask(t); }}>✏</button>
                    <button className="btn-del" onClick={e => { e.stopPropagation(); deleteTask(t.id); }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }


    /* ─── Stage 1: 새 컴포넌트 ─── */

    function ResourceMini({ resources, onClick }) {
      const [hover, setHover] = useState(false);
      const r = resources || INITIAL_RESOURCES;
      const income = r.money?.income || 0;
      const expenses = r.money?.expenses || 0;
      const profit = income - expenses;
      const energyUsed = r.energy?.used || 0;
      const energyPool = r.energy?.weeklyPool || 100;
      const energyLeft = energyPool - energyUsed;
      const timeUsed = r.time?.used || 0;
      const timePool = r.time?.weeklyPool || 72;
      return (
        <div className="resource-mini" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}>
          <div className={"resource-mini-item " + (profit >= 0 ? "positive" : "negative")}>
            <span className="ic">💰</span>
            <span className="val">{profit >= 0 ? "+" : ""}{Math.round(profit/10000)}만</span>
          </div>
          <div className="resource-mini-item">
            <span className="ic">⚡</span>
            <span className="val">{energyLeft}</span>
          </div>
          <div className="resource-mini-item">
            <span className="ic">⏰</span>
            <span className="val">{timeUsed.toFixed(0)}h</span>
          </div>
          {hover && (
            <div className="resource-mini-tooltip" onClick={(e) => e.stopPropagation()}>
              <div className="rmt-row"><span className="rmt-label">💰 수입</span><span className="rmt-value green">+{income.toLocaleString()}원</span></div>
              <div className="rmt-row"><span className="rmt-label">💰 지출</span><span className="rmt-value red">-{expenses.toLocaleString()}원</span></div>
              <div className="rmt-row"><span className="rmt-label">순이익</span><span className={"rmt-value " + (profit >= 0 ? "green" : "red")}>{profit >= 0 ? "+" : ""}{profit.toLocaleString()}원</span></div>
              <div className="rmt-divider" />
              <div className="rmt-row"><span className="rmt-label">⚡ 에너지</span><span className="rmt-value">{energyUsed} / {energyPool}</span></div>
              <div className="rmt-row"><span className="rmt-label">남은 에너지</span><span className="rmt-value green">{energyLeft}</span></div>
              <div className="rmt-divider" />
              <div className="rmt-row"><span className="rmt-label">⏰ 시간 사용</span><span className="rmt-value">{timeUsed.toFixed(1)}h / {timePool}h</span></div>
              <div className="rmt-hint">클릭 → 자원·아이템 탭 (Stage 3)</div>
            </div>
          )}
        </div>
      );
    }

    function StatModal({ open, onClose, stats, setStats, onOpenGuide }) {
      const [editMode, setEditMode] = useState(false);
      if (!open) return null;

      const updateStat = (id, field, value) => {
        setStats((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
      };
      const deleteStat = (id) => setStats((prev) => prev.filter((s) => s.id !== id));
      const addStat = () => {
        const id = "s" + Date.now();
        setStats((prev) => [...prev, { id, icon: "⭐", label: "새 스탯", totalXp: 0, desc: "측정값", value: 0, unit: "개" }]);
      };
      const totalLv = stats.reduce((a, s) => a + statLevel(getStatTotalXp(s)), 0);

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box" style={{ width: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">⚔️ 캐릭터 스탯</div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              {!editMode ? (
                <div className="stat-detail-grid">
                  {stats.map((s) => {
                    const tx = getStatTotalXp(s);
                    const lv = statLevel(tx);
                    const prog = statLevelProgress(tx);
                    const title = STAT_TITLES[lv - 1] || "";
                    return (
                      <div key={s.id} className="stat-detail-card">
                        <div className="sdc-head">
                          <div className="sdc-name"><span className="ic">{s.icon}</span>{s.label}</div>
                          <div className="sdc-lv">Lv.<strong>{lv}</strong>{lv === 10 ? " 👑" : ""}</div>
                        </div>
                        <div className="sdc-title">"{s.label} {title}"</div>
                        <div className="sdc-xp">
                          <span>XP {tx.toLocaleString()}</span>
                          <span>{lv >= 10 ? "만렙" : "다음까지 " + (prog.needed - prog.current).toLocaleString()}</span>
                        </div>
                        <div className="sdc-bar"><div className="sdc-bar-fill" style={{ width: prog.pct + "%" }} /></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>아이콘 / 이름 / 총 XP / 단위 / 삭제</div>
                  {stats.map((s) => (
                    <div key={s.id} className="stat-edit-row">
                      <input value={s.icon} onChange={(e) => updateStat(s.id, "icon", e.target.value)} style={{ textAlign: "center" }} />
                      <input value={s.label} onChange={(e) => updateStat(s.id, "label", e.target.value)} placeholder="스탯명" />
                      <input type="number" value={getStatTotalXp(s)} onChange={(e) => updateStat(s.id, "totalXp", Number(e.target.value) || 0)} placeholder="총 XP" />
                      <input value={s.unit || ""} onChange={(e) => updateStat(s.id, "unit", e.target.value)} placeholder="단위" />
                      <button className="btn-del" onClick={() => deleteStat(s.id)}>×</button>
                    </div>
                  ))}
                  <button className="stat-detail-btn" style={{ width: "100%", marginTop: 8 }} onClick={addStat}>+ 스탯 추가</button>
                </div>
              )}
              <div className="sum-level-box">
                <span className="sl-big">종합 Lv.{totalLv}</span>
                {stats.map((s) => statLevel(getStatTotalXp(s))).join(" + ")} = {totalLv}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={onOpenGuide}>📖 레벨 가이드</button>
              <button className="btn-save" onClick={() => setEditMode(!editMode)}>
                {editMode ? "✓ 수정 완료" : "✏️ 수정 모드"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    function LevelGuideModal({ open, onClose, currentMaxLevel }) {
      if (!open) return null;
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">📖 레벨 가이드</div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              <div className="guide-section">
                <div className="guide-section-title">⚡ XP 획득 기준</div>
                <table className="guide-table">
                  <thead><tr><th>행동</th><th style={{ textAlign: "right" }}>XP</th></tr></thead>
                  <tbody>
                    <tr><td>할일 완료 (일반)</td><td style={{ textAlign: "right" }}>15 XP</td></tr>
                    <tr><td>할일 완료 (Q1·중요+긴급)</td><td style={{ textAlign: "right" }}>40 XP</td></tr>
                    <tr><td>목표 단계 완료</td><td style={{ textAlign: "right" }}>150 XP</td></tr>
                    <tr><td>목표 전체 달성</td><td style={{ textAlign: "right" }}>600 XP</td></tr>
                    <tr><td>드림 달성 (Normal)</td><td style={{ textAlign: "right" }}>400 XP</td></tr>
                    <tr><td>드림 달성 (Rare)</td><td style={{ textAlign: "right" }}>1,000 XP</td></tr>
                    <tr><td>드림 달성 (Epic)</td><td style={{ textAlign: "right" }}>2,500 XP</td></tr>
                    <tr><td>드림 달성 (Legend)</td><td style={{ textAlign: "right" }}>5,000 XP</td></tr>
                    <tr><td>3일 연속 스트릭</td><td style={{ textAlign: "right", color: "var(--green)" }}>+10%</td></tr>
                    <tr><td>7일 연속 스트릭</td><td style={{ textAlign: "right", color: "var(--green)" }}>+25%</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="guide-section">
                <div className="guide-section-title">📈 스탯 레벨업 (10레벨 만렙)</div>
                <table className="guide-table">
                  <thead><tr><th>레벨</th><th>필요 XP</th><th>누적 XP</th><th>칭호</th></tr></thead>
                  <tbody>
                    {[1,2,3,4,5,6,7,8,9,10].map((lv) => (
                      <tr key={lv} className={lv === currentMaxLevel ? "lv-cur" : ""}>
                        <td className="lv-num">Lv.<strong>{lv}</strong></td>
                        <td>{lv === 1 ? "—" : (STAT_LEVEL_REQ[lv - 1] - STAT_LEVEL_REQ[lv - 2]).toLocaleString()}</td>
                        <td className={lv === 10 ? "lv-max" : ""}>{STAT_LEVEL_REQ[lv - 1].toLocaleString()}</td>
                        <td>{STAT_TITLES[lv - 1]}{lv === 10 ? " 👑" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="guide-section">
                <div className="guide-section-title">🏆 레벨업 보상</div>
                <table className="guide-table">
                  <tbody>
                    <tr><td>Lv.3</td><td>"입문자" 칭호 해금</td></tr>
                    <tr><td>Lv.5</td><td>골드 배지 + 해당 스탯 목표 슬롯 +1</td></tr>
                    <tr><td>Lv.7</td><td>특수 칭호 ("크리에이터" 등)</td></tr>
                    <tr><td>Lv.10</td><td>👑 만렙 왕관 + 드림 연동 조건 해금</td></tr>
                    <tr><td>종합 Lv.20</td><td>대시보드 테마 색상 선택권</td></tr>
                    <tr><td>종합 Lv.40</td><td>드림 슬롯 추가 (+1)</td></tr>
                    <tr><td>종합 Lv.60</td><td>🏅 만렙 엔딩 "레전드"</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="guide-note">
                ※ 각 스탯은 연결된 목표·할일 완료 시 해당 스탯 XP 획득. 만렙(Lv.10)까지 약 17,820 XP 필요 (Stage 2에서 자동 누적 가동).
              </div>
            </div>
          </div>
        </div>
      );
    }

    function SettingsModal({ open, onClose, settings, setSettings, onLogout }) {
      const [testResult, setTestResult] = useState(null);
      const [testing, setTesting] = useState(false);
      const [imgTestResult, setImgTestResult] = useState(null);
      const [imgTesting, setImgTesting] = useState(false);
      if (!open) return null;
      const update = (k, v) => setSettings((prev) => ({ ...prev, [k]: v }));

      const runTextTest = async () => {
        setTesting(true); setTestResult(null);
        try {
          const r = await geminiTest(settings.geminiKey, settings.geminiTextModel || "gemini-2.5-flash");
          setTestResult({ ok: true, msg: "✓ 텍스트 모델 정상 (" + r.trim().slice(0, 40) + ")" });
        } catch (e) {
          setTestResult({ ok: false, msg: "✗ " + e.message });
        } finally { setTesting(false); }
      };

      const runImageTest = async () => {
        setImgTesting(true); setImgTestResult(null);
        try {
          const url = await geminiGenerateImage(settings.geminiKey, "blue square test image", settings.geminiImageModel);
          setImgTestResult({ ok: true, msg: "✓ 이미지 모델 정상 (" + Math.round(url.length / 1024) + "KB 생성됨)" });
        } catch (e) {
          setImgTestResult({ ok: false, msg: "✗ " + e.message });
        } finally { setImgTesting(false); }
      };

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">⚙️ 설정</div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <div className="settings-section-title">🤖 Gemini AI 연동</div>
                <div className="settings-field">
                  <label>API Key</label>
                  <input type="password" value={settings.geminiKey || ""} onChange={(e) => update("geminiKey", e.target.value)} placeholder="AIza..." />
                </div>
                <div className="settings-hint">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" style={{ color: "var(--accent)" }}>aistudio.google.com</a>에서 발급
                </div>

                <div className="settings-field" style={{ marginTop: 12 }}>
                  <label>텍스트 모델</label>
                  <select value={settings.geminiTextModel} onChange={(e) => update("geminiTextModel", e.target.value)} style={{ flex: 1 }}>
                    {GEMINI_TEXT_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    {!GEMINI_TEXT_MODELS.find(m => m.id === settings.geminiTextModel) && settings.geminiTextModel && (
                      <option value={settings.geminiTextModel}>⚙ {settings.geminiTextModel} (커스텀)</option>
                    )}
                  </select>
                  <button onClick={runTextTest} disabled={testing || !settings.geminiKey} style={{ background: "var(--accent)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Geist, sans-serif", whiteSpace: "nowrap" }}>
                    {testing ? "..." : "테스트"}
                  </button>
                </div>
                {testResult && (
                  <div className="settings-hint" style={{ color: testResult.ok ? "var(--green)" : "var(--red)", padding: "4px 8px", background: testResult.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", borderRadius: 4, marginTop: 4, fontFamily: "Geist Mono, monospace", fontSize: 11.5 }}>
                    {testResult.msg}
                  </div>
                )}

                <div className="settings-field" style={{ marginTop: 12 }}>
                  <label>이미지 모델</label>
                  <select value={settings.geminiImageModel} onChange={(e) => update("geminiImageModel", e.target.value)} style={{ flex: 1 }}>
                    {GEMINI_IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    {!GEMINI_IMAGE_MODELS.find(m => m.id === settings.geminiImageModel) && settings.geminiImageModel && (
                      <option value={settings.geminiImageModel}>⚙ {settings.geminiImageModel} (커스텀)</option>
                    )}
                  </select>
                  <button onClick={runImageTest} disabled={imgTesting || !settings.geminiKey} style={{ background: "var(--accent)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Geist, sans-serif", whiteSpace: "nowrap" }}>
                    {imgTesting ? "..." : "테스트"}
                  </button>
                </div>
                {imgTestResult && (
                  <div className="settings-hint" style={{ color: imgTestResult.ok ? "var(--green)" : "var(--red)", padding: "4px 8px", background: imgTestResult.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", borderRadius: 4, marginTop: 4, fontFamily: "Geist Mono, monospace", fontSize: 11.5, wordBreak: "break-word" }}>
                    {imgTestResult.msg}
                  </div>
                )}
                <div className="settings-field" style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 11.5 }}>커스텀 모델</label>
                  <input type="text" placeholder="(드롭다운에 없는 모델 직접 입력)" onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      const isImage = /image|imagen/i.test(e.target.value);
                      update(isImage ? "geminiImageModel" : "geminiTextModel", e.target.value.trim());
                      e.target.value = "";
                    }
                  }} />
                </div>
                <div className="settings-hint" style={{ marginTop: 4 }}>
                  Enter로 적용 · "image"/"imagen" 포함 시 이미지 모델로 자동 분류
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">⏰ 시간·에너지</div>
                <div className="settings-field">
                  <label>주간 시간풀</label>
                  <input type="number" value={settings.weeklyTimePool || 72} onChange={(e) => update("weeklyTimePool", Number(e.target.value) || 72)} />
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>시간 / 주</span>
                </div>
                <div className="settings-hint">기본 72h (12h × 6일)</div>
                <div className="settings-field" style={{ marginTop: 12 }}>
                  <label>주간 에너지풀</label>
                  <input type="number" value={settings.weeklyEnergyPool || 100} onChange={(e) => update("weeklyEnergyPool", Number(e.target.value) || 100)} />
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>포인트 / 주</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">🌟 드림 갤러리</div>
                <div className="settings-field">
                  <label>이름 크기</label>
                  <input type="range" min="14" max="32" step="1" value={(settings.dreamGalleryNameSize >= 14 && settings.dreamGalleryNameSize <= 32) ? settings.dreamGalleryNameSize : 19} onChange={(e) => update("dreamGalleryNameSize", Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 13, color: "var(--accent)", minWidth: 56, textAlign: "right" }}>{((settings.dreamGalleryNameSize >= 14 && settings.dreamGalleryNameSize <= 32) ? settings.dreamGalleryNameSize : 19)}px</span>
                </div>
                <div className="settings-hint">드림 이름 폰트 (14~32px) · 퍼센트·티어 뱃지도 비례 조정됨 (기본 19px)</div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">📅 개인 정보 (인생 게이지)</div>
                <div className="settings-field">
                  <label>생년월일</label>
                  <input type="date" value={settings.birthDate || ""} onChange={(e) => update("birthDate", e.target.value)} />
                </div>
                <div className="settings-field" style={{ marginTop: 12 }}>
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
                <div className="settings-hint">한국 평균수명: 남 80.6 / 여 86.6</div>
                <div className="settings-field" style={{ marginTop: 12 }}>
                  <label>예상 수명</label>
                  <input type="number" step="0.1" value={settings.expectedLifespan || 80.6} onChange={(e) => update("expectedLifespan", Number(e.target.value) || 80.6)} />
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>세</span>
                </div>
                <div className="settings-field" style={{ marginTop: 12 }}>
                  <label>은퇴 나이</label>
                  <input type="number" value={settings.retireAge || 65} onChange={(e) => update("retireAge", Number(e.target.value) || 65)} />
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>세</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">계정</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", padding: "4px 0" }}>{ALLOWED_EMAIL}</div>
                <button onClick={onLogout} style={{ marginTop: 10, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-3)", fontSize: 13, padding: "6px 14px", cursor: "pointer", fontFamily: "Geist, sans-serif" }}>로그아웃</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    /* ---------- App ---------- */

    /* ─── Stage 2: 헬퍼 ─── */
    const TAG_TO_STAT = {
      "유튜브": "youtube", "콘텐츠": "youtube",
      "부동산": "estate",
      "개발": "dev", "NoteUp": "dev",
      "영어": "english", "리서치": "english",
      "건강": "health", "운동": "health",
      "재정": "finance",
      "회고": "english"
    };
    function tagToStat(tag) { return TAG_TO_STAT[tag] || null; }
    function streakBonus(streak) {
      const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      const count = streak.filter((v, i) => i <= todayIdx && v).length;
      if (count >= 7) return 0.25;
      if (count >= 3) return 0.10;
      return 0;
    }
    function xpForTask(task) {
      return task.quadrant === 1 ? 40 : 15;
    }
    function resolveStatId(task, goals) {
      if (task.statId) return task.statId;
      if (task.goalId) {
        const g = goals.find((x) => x.id === task.goalId);
        if (g && g.statId) return g.statId;
        if (g && g.category) {
          const cat = g.category.toLowerCase();
          if (cat.includes("유튜브") || cat.includes("creator")) return "youtube";
          if (cat.includes("부동산")) return "estate";
          if (cat.includes("개발") || cat.includes("project") || cat.includes("noteup")) return "dev";
        }
      }
      return tagToStat(task.tag);
    }

    /* ─── XP 토스트 ─── */
    function XpToast({ event }) {
      if (!event) return null;
      return (
        <div className="xp-toast" key={event.id}>
          +{event.xp} XP {event.statId ? "· " + event.statId : ""}
        </div>
      );
    }

    /* ─── Stage 2: GoalsTasksRetroTab ─── */
    /* ─── 목표별 업무 뷰 (목표 × 컬럼) ─── */
    function FieldTaskView({ tasks, goals, stats, toggleTask, setEditingTaskId, deleteTask, goalColor, addTask }) {
      const grouped = goals.map(g => ({
        goal: g,
        tasks: tasks.filter(t => t.goalId === g.id)
      }));
      const unlinked = tasks.filter(t => !t.goalId);
      const [addModalGoal, setAddModalGoal] = useState(null); // goalId 또는 "unlinked"
      const [addText, setAddText] = useState("");
      const [addQuad, setAddQuad] = useState(2);
      const closeAdd = () => { setAddModalGoal(null); setAddText(""); setAddQuad(2); };
      const submitAdd = () => {
        const text = addText.trim();
        if (!text) { closeAdd(); return; }
        const goalId = addModalGoal === "unlinked" ? null : addModalGoal;
        if (addTask) addTask({
          id: "t" + Date.now(), text, quadrant: Number(addQuad) || 2,
          goalId, questId: null, tag: "", dueDate: "", done: false, time: ""
        });
        closeAdd();
      };

      return (
        <div className="field-task-grid">
          {grouped.map(({ goal: g, tasks: list }) => (
            <div key={g.id} className="field-task-col" style={{ borderLeft: `3px solid ${goalColor(g.id)}` }}>
              <div className="field-col-head">
                <span className="field-col-name" style={{ color: goalColor(g.id) }}>{g.name}</span>
                <span className="field-col-count">{list.filter(t => t.done).length}/{list.length}</span>
              </div>
              {list.length === 0 && <div className="field-col-empty">없음</div>}
              {list.map(t => (
                <div key={t.id} className={"eq-task-row" + (t.done ? " done" : "")} style={{ boxShadow: `inset 3px 0 0 ${goalColor(g.id)}` }}>
                  <div className="cb" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} style={{ cursor: "pointer" }} />
                  <span className="eq-task-text" onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); }} style={{ cursor: "text" }}>{t.text}</span>
                  <span className="qtag" style={{ background: "var(--bg-3)", color: "var(--text-3)" }}>Q{t.quadrant}</span>
                  <button className="del-x" onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}>×</button>
                </div>
              ))}
              <div className="field-add-zone" onDoubleClick={() => setAddModalGoal(g.id)} title="더블클릭으로 업무 추가">＋ 더블클릭하여 추가</div>
            </div>
          ))}
          {unlinked.length > 0 && (
            <div className="field-task-col" style={{ gridColumn: "1 / -1" }}>
              <div className="field-col-head">
                <span className="field-col-name">⚡ 목표 미연결</span>
                <span className="field-col-count">{unlinked.length}</span>
              </div>
              {unlinked.map(t => (
                <div key={t.id} className={"eq-task-row" + (t.done ? " done" : "")}>
                  <div className="cb" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} style={{ cursor: "pointer" }} />
                  <span className="eq-task-text" onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); }} style={{ cursor: "text" }}>{t.text}</span>
                  <span className="qtag">Q{t.quadrant}</span>
                </div>
              ))}
              <div className="field-add-zone" onDoubleClick={() => setAddModalGoal("unlinked")} title="더블클릭으로 업무 추가">＋ 더블클릭하여 추가</div>
            </div>
          )}

          {/* 간소화 입력 모달 */}
          {addModalGoal && (() => {
            const targetGoal = addModalGoal === "unlinked" ? null : goals.find(g => g.id === addModalGoal);
            return (
              <div className="modal-overlay" onClick={closeAdd}>
                <div className="quickadd-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="quickadd-head">
                    <div>
                      <div className="quickadd-title">⚡ 새 업무</div>
                      <div className="quickadd-target" style={targetGoal ? { color: goalColor(targetGoal.id) } : null}>
                        {targetGoal ? "🎯 " + targetGoal.name : "⚡ 목표 미연결"}
                      </div>
                    </div>
                  </div>
                  <div className="quickadd-body">
                    <input
                      autoFocus
                      className="quickadd-input"
                      value={addText}
                      onChange={(e) => setAddText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAdd();
                        if (e.key === "Escape") closeAdd();
                      }}
                      placeholder="할 일 내용"
                    />
                    <div className="quickadd-quads">
                      <button className={"quickadd-quad q1" + (Number(addQuad) === 1 ? " active" : "")} onClick={() => setAddQuad(1)}>Q1 긴급·중요</button>
                      <button className={"quickadd-quad q2" + (Number(addQuad) === 2 ? " active" : "")} onClick={() => setAddQuad(2)}>Q2 중요</button>
                      <button className={"quickadd-quad q3" + (Number(addQuad) === 3 ? " active" : "")} onClick={() => setAddQuad(3)}>Q3 긴급</button>
                      <button className={"quickadd-quad q4" + (Number(addQuad) === 4 ? " active" : "")} onClick={() => setAddQuad(4)}>Q4 나중</button>
                    </div>
                    <div className="quickadd-hint">Enter 추가 · ESC 취소 · 세부 편집은 추가 후 텍스트 클릭</div>
                  </div>
                  <div className="quickadd-foot">
                    <button className="quickadd-btn-cancel" onClick={closeAdd}>취소</button>
                    <button className="quickadd-btn-save" onClick={submitAdd} disabled={!addText.trim()}>✓ 추가</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }

    /* ─── 주간 업무 뷰 (요일 그리드 + 일정/업무 + Google 연결 stub) ─── */
    function WeeklyTaskView({ tasks, goals, stats, toggleTask, setEditingTaskId, goalColor, settings, setSettings }) {
      const savedMode = settings?.calendarMode === "month" ? "month" : "week";
      const [mode, setMode] = useState(savedMode);
      const setModePersist = (m) => { setMode(m); setSettings(p => ({ ...p, calendarMode: m })); };
      const [cursor, setCursor] = useState(new Date()); // 현재 표시 기준일

      const today = new Date();
      const fmt = (d) => d.toISOString().slice(0, 10);
      const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

      const tasksByDate = (dateStr) => tasks.filter(t => t.dueDate === dateStr);
      const schedules = settings?.schedules || [];
      const schedulesByDate = (dateStr) => schedules.filter(s => s.date === dateStr);

      // 일정 빠른 추가 모달 state
      const [schModalDate, setSchModalDate] = useState(null);
      const [schModalText, setSchModalText] = useState("");
      const openSchModal = (dateStr) => { setSchModalDate(dateStr); setSchModalText(""); };
      const closeSchModal = () => { setSchModalDate(null); setSchModalText(""); };
      const submitSchedule = () => {
        const title = schModalText.trim();
        if (!title || !schModalDate) { closeSchModal(); return; }
        const id = "sch" + Date.now();
        setSettings(p => ({ ...p, schedules: [...(p.schedules || []), { id, date: schModalDate, title }] }));
        closeSchModal();
      };
      const deleteSchedule = (id) => {
        if (!confirm("일정을 삭제할까요?")) return;
        setSettings(p => ({ ...p, schedules: (p.schedules || []).filter(s => s.id !== id) }));
      };

      // 주간 — 월~일 7일
      const weekDays = (() => {
        const day = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
        const monday = new Date(cursor); monday.setDate(cursor.getDate() - day);
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday); d.setDate(monday.getDate() + i);
          return d;
        });
      })();

      // 월간 — 그 달의 1일~말일, 앞뒤 다른 달 패딩 포함 (7×6 그리드)
      const monthDays = (() => {
        const y = cursor.getFullYear(), m = cursor.getMonth();
        const first = new Date(y, m, 1);
        const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1; // 월=0
        const start = new Date(first); start.setDate(1 - firstWeekday);
        return Array.from({ length: 42 }, (_, i) => {
          const d = new Date(start); d.setDate(start.getDate() + i);
          return d;
        });
      })();

      const goPrev = () => {
        const next = new Date(cursor);
        if (mode === "week") next.setDate(cursor.getDate() - 7);
        else next.setMonth(cursor.getMonth() - 1);
        setCursor(next);
      };
      const goNext = () => {
        const next = new Date(cursor);
        if (mode === "week") next.setDate(cursor.getDate() + 7);
        else next.setMonth(cursor.getMonth() + 1);
        setCursor(next);
      };
      const goToday = () => setCursor(new Date());

      const renderDayCell = (d, options = {}) => {
        const ds = fmt(d);
        const isToday = ds === fmt(today);
        const isOtherMonth = options.dim && d.getMonth() !== cursor.getMonth();
        const dayTasks = tasksByDate(ds);
        const daySchedules = schedulesByDate(ds);
        return (
          <div key={ds + (options.keyPrefix || "")} className={"weekly-day" + (isToday ? " today" : "") + (isOtherMonth ? " other-month" : "")} onDoubleClick={() => openSchModal(ds)} title="더블클릭으로 일정 추가">
            <div className="weekly-day-head">
              {options.showWeekday !== false && <span className="dlbl">{dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>}
              <span className="dnum">{d.getDate()}</span>
            </div>
            <div className="weekly-day-body">
              {daySchedules.map(s => (
                <div key={s.id} className="weekly-sch" title={s.title} onClick={(e) => { e.stopPropagation(); if (confirm("'" + s.title + "' 삭제할까요?")) deleteSchedule(s.id); }}>
                  📌 {s.title}
                </div>
              ))}
              {dayTasks.map(t => {
                const g = t.goalId ? goals.find(x => x.id === t.goalId) : null;
                return (
                  <div key={t.id} className={"weekly-task" + (t.done ? " done" : "")} style={g ? { borderLeftColor: goalColor(g.id) } : null} onClick={() => setEditingTaskId(t.id)} title={t.text + (g ? " · " + g.name : "")}>
                    <div className="cb" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} />
                    <span className="t">{t.text}</span>
                    {g && <span className="meta">{g.name.slice(0, 4)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const headLabel = mode === "week"
        ? `${fmt(weekDays[0]).slice(5)} ~ ${fmt(weekDays[6]).slice(5)}`
        : `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;

      return (
        <div>
          <div className="weekly-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="cal-mode-btn" onClick={goPrev} title="이전">◀</button>
              <button className="cal-mode-btn" onClick={goToday}>오늘</button>
              <button className="cal-mode-btn" onClick={goNext} title="다음">▶</button>
              <div style={{ fontSize: 14, color: "var(--text-2)", fontFamily: "Geist Mono, monospace", marginLeft: 8, fontWeight: 700 }}>{headLabel}</div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div className="cal-mode-toggle">
                <button className={mode === "week" ? "active" : ""} onClick={() => setModePersist("week")}>주간</button>
                <button className={mode === "month" ? "active" : ""} onClick={() => setModePersist("month")}>월간</button>
              </div>
              <button className="gcal-connect-btn" onClick={() => alert("Google Calendar 연동 안내\n\n1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성\n2. Calendar API 활성화\n3. 클라이언트 ID를 설정에 입력\n4. '연결' 버튼 → 권한 허용\n\n(설정 후 양방향 동기 활성화. 현재는 자체 캘린더만 동작)")} title="Google Calendar 연동">🔗 Google</button>
            </div>
          </div>

          {mode === "week" ? (
            <div className="weekly-grid">
              {weekDays.map(d => renderDayCell(d))}
            </div>
          ) : (
            <>
              <div className="month-weekday-row">
                {dayLabels.map(l => <div key={l} className="month-weekday-lbl">{l}</div>)}
              </div>
              <div className="month-grid">
                {monthDays.map(d => renderDayCell(d, { dim: true, showWeekday: false, keyPrefix: "m" }))}
              </div>
            </>
          )}

          {/* 일정 빠른 추가 모달 */}
          {schModalDate && (
            <div className="modal-overlay" onClick={closeSchModal}>
              <div className="sch-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sch-head">
                  <div className="sch-title">📅 새 일정</div>
                  <div className="sch-date">{schModalDate}</div>
                </div>
                <div className="sch-body">
                  <input
                    autoFocus
                    className="sch-input"
                    value={schModalText}
                    onChange={(e) => setSchModalText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) submitSchedule();
                      if (e.key === "Escape") closeSchModal();
                    }}
                    placeholder="일정 제목 (예: 10:00 미팅)"
                  />
                  <div className="sch-hint">💡 시간을 포함하면 자동 표기됩니다 · Enter로 추가, ESC로 취소</div>
                </div>
                <div className="sch-foot">
                  <button className="sch-btn-cancel" onClick={closeSchModal}>취소</button>
                  <button className="sch-btn-save" onClick={submitSchedule} disabled={!schModalText.trim()}>✓ 추가</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    /* ─── 집중모드 뷰 (포모도로 + 드래그 큐) ─── */
    function FocusModeView({ tasks, goals, stats, toggleTask, settings, setSettings, addTask, setEditingTaskId }) {
      // 빠른 추가 입력
      const [quickAddText, setQuickAddText] = useState("");
      const [quickAddOpen, setQuickAddOpen] = useState(false);
      const handleQuickAdd = () => {
        const text = quickAddText.trim();
        if (!text) { setQuickAddOpen(false); return; }
        if (addTask) addTask({
          id: "t" + Date.now(), text, quadrant: 2,
          goalId: null, questId: null, tag: "", dueDate: "", done: false, time: ""
        });
        setQuickAddText("");
        setQuickAddOpen(false);
      };

      // 큐 우측 폭 조절
      const savedQueueWidth = (typeof settings?.focusQueueWidth === "number" && settings.focusQueueWidth >= 200 && settings.focusQueueWidth <= 800) ? settings.focusQueueWidth : 320;
      const [queueWidth, setQueueWidth] = useState(savedQueueWidth);
      const queueWidthRef = useRef(queueWidth);
      useEffect(() => { queueWidthRef.current = queueWidth; }, [queueWidth]);
      const startQueueResize = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = queueWidth;
        const onMove = (ev) => {
          const delta = startX - ev.clientX; // 오른쪽 → 왼쪽으로 드래그하면 큐 폭 늘어남
          let next = Math.max(200, Math.min(800, startW + delta));
          setQueueWidth(next);
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          if (setSettings) setSettings(p => ({ ...p, focusQueueWidth: queueWidthRef.current }));
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      };

      const POMO_WORK = 25 * 60;
      const POMO_REST = 5 * 60;
      const [seconds, setSeconds] = useState(POMO_WORK);
      const [running, setRunning] = useState(false);
      const [phase, setPhase] = useState("work"); // work | rest
      const [completedPomos, setCompletedPomos] = useState(0);
      const [currentTaskId, setCurrentTaskId] = useState(null);

      const savedQueue = Array.isArray(settings?.focusQueue) ? settings.focusQueue : null;
      // 큐: tasks 중 미완료 항목들. 사용자 저장 순서 우선, 그 외는 Q1>Q2>Q3>Q4 순
      const queueIds = React.useMemo(() => {
        const pending = tasks.filter(t => !t.done).map(t => t.id);
        if (savedQueue && savedQueue.length > 0) {
          const inSaved = savedQueue.filter(id => pending.includes(id));
          const newones = pending.filter(id => !savedQueue.includes(id));
          return [...inSaved, ...newones];
        }
        return [...pending].sort((a, b) => {
          const ta = tasks.find(x => x.id === a);
          const tb = tasks.find(x => x.id === b);
          return (ta?.quadrant || 5) - (tb?.quadrant || 5);
        });
      }, [tasks, savedQueue]);

      const queue = queueIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
      const currentTask = currentTaskId ? tasks.find(t => t.id === currentTaskId) : queue[0];

      const persistQueue = (newIds) => {
        if (setSettings) setSettings(p => ({ ...p, focusQueue: newIds }));
      };

      // 타이머
      React.useEffect(() => {
        if (!running) return;
        const t = setInterval(() => {
          setSeconds(s => {
            if (s <= 1) {
              if (phase === "work") {
                setCompletedPomos(c => c + 1);
                setPhase("rest");
                return POMO_REST;
              } else {
                setPhase("work");
                return POMO_WORK;
              }
            }
            return s - 1;
          });
        }, 1000);
        return () => clearInterval(t);
      }, [running, phase]);

      const totalSec = phase === "work" ? POMO_WORK : POMO_REST;
      const pct = ((totalSec - seconds) / totalSec) * 100;
      const dash = 565;
      const offset = dash * (1 - pct / 100);
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");

      const reset = () => { setSeconds(phase === "work" ? POMO_WORK : POMO_REST); setRunning(false); };
      const skipToNext = () => {
        if (!currentTask) return;
        const idx = queueIds.indexOf(currentTask.id);
        if (idx >= 0 && idx < queueIds.length - 1) setCurrentTaskId(queueIds[idx + 1]);
      };
      const skipToPrev = () => {
        if (!currentTask) return;
        const idx = queueIds.indexOf(currentTask.id);
        if (idx > 0) setCurrentTaskId(queueIds[idx - 1]);
      };
      const completeCurrent = () => {
        if (currentTask) {
          toggleTask(currentTask.id);
          const idx = queueIds.indexOf(currentTask.id);
          const next = queueIds[idx + 1];
          if (next) setCurrentTaskId(next);
        }
      };

      // 드래그 정렬
      const [dragIdx, setDragIdx] = useState(null);
      const [dragOverIdx, setDragOverIdx] = useState(null);
      const onDragStart = (i) => () => setDragIdx(i);
      const onDragOver = (i) => (e) => { e.preventDefault(); setDragOverIdx(i); };
      const onDrop = (i) => (e) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
        const next = [...queueIds];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(i, 0, moved);
        persistQueue(next);
        setDragIdx(null); setDragOverIdx(null);
      };
      const onDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

      return (
        <div className="focus-mode-view" style={{ gridTemplateColumns: `minmax(0, 1fr) 6px ${queueWidth}px` }}>
          <div className="focus-left">
          <div className="focus-current-box">
            <div className="lbl">📍 현재 집중</div>
            <div className="task">{currentTask ? currentTask.text : "큐가 비어있습니다"}</div>
            {currentTask && currentTask.goalId && goals.find(g => g.id === currentTask.goalId) && (
              <div className="goal-sub">📎 {goals.find(g => g.id === currentTask.goalId).name}</div>
            )}
          </div>

          <div className="pomo-circle">
            <svg viewBox="0 0 200 200">
              <defs>
                <linearGradient id="pomoGradFM" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle className="pomo-bg" cx="100" cy="100" r="90" />
              <circle className={"pomo-fg" + (phase === "rest" ? " rest" : "")} cx="100" cy="100" r="90" strokeDasharray={dash} strokeDashoffset={offset} />
            </svg>
            <div className="pomo-time">
              <div className="big">{mm}:{ss}</div>
              <div className={"lbl " + phase}>{phase === "work" ? "WORK" : "REST"}</div>
            </div>
          </div>

          <div className="pomo-controls">
            <button className="pomo-btn" onClick={skipToPrev} title="이전 업무">⏮</button>
            {!running
              ? <button className="pomo-btn primary" onClick={() => setRunning(true)}>▶ 시작</button>
              : <button className="pomo-btn primary" onClick={() => setRunning(false)}>⏸ 일시정지</button>}
            <button className="pomo-btn" onClick={completeCurrent} disabled={!currentTask}>✓ 완료</button>
            <button className="pomo-btn" onClick={skipToNext} title="다음 업무">⏭</button>
            <button className="pomo-btn" onClick={reset}>↻ 초기화</button>
          </div>

          <div className="pomo-stats">
            <span className="lbl">오늘 {completedPomos} 포모도로</span>
            <div className="dots">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={"pomo-dot" + (i < completedPomos ? " done" : "")} />
              ))}
            </div>
          </div>
          </div>

          <div className="focus-queue-resize" onMouseDown={startQueueResize} title="드래그로 큐 폭 조절" />
          <div className="focus-right">
          <div className="focus-queue-title">⚡ 업무 큐 ({queue.length}) — 클릭 추가 · 더블클릭 수정 · 드래그 정렬</div>
          {quickAddOpen ? (
            <input
              autoFocus
              className="focus-queue-quick-input"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleQuickAdd();
                if (e.key === "Escape") { setQuickAddOpen(false); setQuickAddText(""); }
              }}
              onBlur={() => { if (quickAddText.trim()) handleQuickAdd(); else setQuickAddOpen(false); }}
              placeholder="새 업무 (Enter)"
            />
          ) : (
            <div className="focus-queue-add-row" onClick={() => setQuickAddOpen(true)}>+ 클릭하여 업무 추가</div>
          )}
          <div className="focus-queue">
            {queue.length === 0 && <div style={{ color: "var(--text-4)", padding: 14, textAlign: "center", fontStyle: "italic", fontSize: 12 }}>완료 안 된 업무가 없습니다</div>}
            {queue.map((t, i) => {
              const g = t.goalId ? goals.find(x => x.id === t.goalId) : null;
              const isCurrent = currentTask?.id === t.id;
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={onDragStart(i)}
                  onDragOver={onDragOver(i)}
                  onDrop={onDrop(i)}
                  onDragEnd={onDragEnd}
                  onClick={() => setCurrentTaskId(t.id)}
                  onDoubleClick={() => setEditingTaskId && setEditingTaskId(t.id)}
                  title="클릭 → 현재 집중 · 더블클릭 → 편집"
                  className={"focus-queue-task" + (isCurrent ? " current" : "") + (dragOverIdx === i ? " drag-over" : "") + (dragIdx === i ? " dragging" : "")}
                >
                  <span className="drag-grip">⋮⋮</span>
                  <div className="cb" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} />
                  <span className="t">{t.text}</span>
                  <span className="meta">Q{t.quadrant}{g ? " · " + g.name.slice(0, 4) : ""}</span>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      );
    }

    function GoalsTasksRetroTab({
      goals, setGoals, addGoal, editGoal, deleteGoal, toggleStage, adjustQuestCount,
      tasks, toggleTask, addTask, editTask, deleteTask,
      retros, setRetros, dailyLog, stats, onOpenQuestGuide,
      initialOpenGoalId, onGoalOpened,
      settings, setSettings,
      taskFullscreen, setTaskFullscreen
    }) {
      const toggleStageInForm = toggleStage || ((gId, mId) => {
        const g = goals.find(x => x.id === gId);
        if (!g) return;
        const newStages = (g.milestones || []).map(x => x.id === mId ? { ...x, status: x.status === "done" ? "active" : "done" } : x);
        editGoal(gId, { milestones: newStages });
      });
      const [openGoalId, setOpenGoalId] = useState(null);
      const [editingGoalId, setEditingGoalId] = useState(null);
      const savedTaskTab = (settings?.taskTab && ["eisen","weekly","field","focus"].includes(settings.taskTab)) ? settings.taskTab : "eisen";
      const [taskTab, setTaskTab] = useState(savedTaskTab);
      const persistTaskTab = (v) => { setTaskTab(v); if (setSettings) setSettings(p => ({ ...p, taskTab: v })); };

      // 풀스크린 탭 순환
      const TAB_ORDER = ["eisen", "weekly", "field", "focus"];
      const cycleTab = (dir) => {
        const idx = TAB_ORDER.indexOf(taskTab);
        const nextIdx = (idx + dir + TAB_ORDER.length) % TAB_ORDER.length;
        persistTaskTab(TAB_ORDER[nextIdx]);
      };
      // ESC 키로 풀스크린 종료
      useEffect(() => {
        if (!taskFullscreen) return;
        const onKey = (e) => {
          if (e.key === "Escape") setTaskFullscreen(false);
          else if (e.key === "ArrowRight") cycleTab(1);
          else if (e.key === "ArrowLeft") cycleTab(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [taskFullscreen, taskTab]);

      /* ─── SVG 연결선 + 줌 ─── */
      const gtrRef = useRef(null);
      const [connPaths, setConnPaths] = useState([]);
      const savedZoom = (typeof settings?.gtrZoomLevel === "number" && settings.gtrZoomLevel >= 0.9 && settings.gtrZoomLevel <= 1.5) ? settings.gtrZoomLevel : 1;
      const [gtrZoom, setGtrZoom] = useState(savedZoom);
      const [pendingZoom, setPendingZoom] = useState(savedZoom);

      /* ─── 컬럼 폭 (드래그 리사이즈, settings 영구 저장) ─── */
      const savedWidths = Array.isArray(settings?.gtrColumnWidths) && settings.gtrColumnWidths.length === 3
        ? settings.gtrColumnWidths : [35, 40, 25];
      const [colWidths, setColWidths] = useState(savedWidths);
      const dragInfoRef = useRef(null);

      // 핸들 드래그 시작 (idx: 0 = col0|col1 사이, 1 = col1|col2 사이)
      const startResize = (idx) => (e) => {
        e.preventDefault();
        const containerW = gtrRef.current?.getBoundingClientRect().width || 1;
        dragInfoRef.current = {
          idx,
          startX: e.clientX,
          startWidths: [...colWidths],
          containerW
        };
        const onMove = (ev) => {
          const info = dragInfoRef.current;
          if (!info) return;
          const deltaPct = ((ev.clientX - info.startX) / info.containerW) * 100;
          const next = [...info.startWidths];
          const leftIdx = info.idx;
          const rightIdx = info.idx + 1;
          let newLeft = info.startWidths[leftIdx] + deltaPct;
          let newRight = info.startWidths[rightIdx] - deltaPct;
          // 최소 10%, 최대 75% 클램프
          if (newLeft < 10) { newRight -= (10 - newLeft); newLeft = 10; }
          if (newRight < 10) { newLeft -= (10 - newRight); newRight = 10; }
          if (newLeft > 75) { newRight += (newLeft - 75); newLeft = 75; }
          if (newRight > 75) { newLeft += (newRight - 75); newRight = 75; }
          next[leftIdx] = newLeft;
          next[rightIdx] = newRight;
          setColWidths(next);
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          dragInfoRef.current = null;
          // 드래그 종료 시 settings에 영구 저장
          if (setSettings) setSettings(prev => ({ ...prev, gtrColumnWidths: colWidthsRef.current }));
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      };

      const colWidthsRef = useRef(colWidths);
      React.useEffect(() => { colWidthsRef.current = colWidths; }, [colWidths]);

      // 목표 id → 색상: g.color 있으면 사용, 없으면 HSL hash 폴백
      const goalColor = React.useCallback((gId) => {
        const g = goals.find(x => x.id === gId);
        if (g?.color) return g.color;
        const idx = goals.findIndex(x => x.id === gId);
        const hue = (idx * 47) % 360;
        return `hsl(${hue}, 70%, 62%)`;
      }, [goals]);

      // 구글 캘린더 스타일 색상 팔레트
      const GOAL_COLORS = [
        { name: "자동", value: "" },
        { name: "토마토", value: "#d50000" },
        { name: "탄제린", value: "#f4511e" },
        { name: "바나나", value: "#f6bf26" },
        { name: "세이지", value: "#33b679" },
        { name: "바질", value: "#0b8043" },
        { name: "공작", value: "#039be5" },
        { name: "블루베리", value: "#3f51b5" },
        { name: "라벤더", value: "#7986cb" },
        { name: "포도", value: "#8e24aa" },
        { name: "플라밍고", value: "#e67c73" },
        { name: "그래파이트", value: "#616161" }
      ];

      // 경로 컴퓨트 — 직교 라우팅 (텍스트 통과 회피)
      const recomputePaths = React.useCallback(() => {
        if (!gtrRef.current) return;
        const container = gtrRef.current;
        const cRect = container.getBoundingClientRect();
        const paths = [];
        goals.forEach((g) => {
          const gEl = container.querySelector(`[data-conn-goal="${g.id}"]`);
          if (!gEl) return;
          const gRect = gEl.getBoundingClientRect();
          const gx = gRect.right - cRect.left;
          const gy = gRect.top + gRect.height / 2 - cRect.top;
          const linkedTasks = tasks.filter(t => t.goalId === g.id);
          linkedTasks.forEach((t, idx) => {
            const tEl = container.querySelector(`[data-conn-task="${t.id}"]`);
            if (!tEl) return;
            const tRect = tEl.getBoundingClientRect();
            const tx = tRect.left - cRect.left;
            // 행의 상단 가장자리 근처(행 사이 간격)로 라우팅 → 텍스트 통과 회피
            const ty = tRect.top - cRect.top - 1 - (idx % 3); // 행 위 1~3px (행 간격 영역)
            const tyCenter = tRect.top + tRect.height / 2 - cRect.top;
            // goal-right → 짧은 스텁 → 갭 영역 수직 → 행 상단 가장자리 → 행 시작 직전에서 stop
            const elbowX = gx + 14 + (idx % 3) * 4;
            const r = 4;
            const sgnY = ty > gy ? 1 : (ty < gy ? -1 : 0);
            let d;
            if (sgnY === 0) {
              d = `M ${gx} ${gy} L ${tx} ${ty}`;
            } else {
              d = `M ${gx} ${gy} L ${elbowX - r} ${gy} Q ${elbowX} ${gy} ${elbowX} ${gy + sgnY * r} L ${elbowX} ${ty - sgnY * r} Q ${elbowX} ${ty} ${elbowX + r} ${ty} L ${tx + 4} ${ty}`;
            }
            paths.push({ key: g.id + "-" + t.id, d, color: goalColor(g.id), goalId: g.id, taskId: t.id, done: t.done, gx, gy, tx, ty: tyCenter });
          });
        });
        setConnPaths(paths);
      }, [goals, tasks, goalColor]);

      React.useLayoutEffect(() => {
        recomputePaths();
      }, [recomputePaths, openGoalId, editingGoalId, gtrZoom]);

      React.useEffect(() => {
        const onResize = () => recomputePaths();
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onResize, true);
        return () => {
          window.removeEventListener("resize", onResize);
          window.removeEventListener("scroll", onResize, true);
        };
      }, [recomputePaths]);

      // 대시보드 ✏️ 버튼으로 진입한 경우 해당 목표 자동 열기 + 편집 모드
      useEffect(() => {
        if (initialOpenGoalId) {
          setOpenGoalId(initialOpenGoalId);
          setEditingGoalId(initialOpenGoalId);
          const g = goals.find(x => x.id === initialOpenGoalId);
          if (g) {
            setEditGoalForm({
              name: g.name, category: g.category, deadline: g.deadline,
              progress: g.progress, statId: g.statId || "", tier: g.tier || ""
            });
          }
          setTimeout(() => {
            const el = document.querySelector("[data-goal-id=\"" + initialOpenGoalId + "\"]");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
          onGoalOpened && onGoalOpened();
        }
      }, [initialOpenGoalId]);
      const [editGoalForm, setEditGoalForm] = useState({});
      const [showAddGoal, setShowAddGoal] = useState(false);
      const [newGoal, setNewGoal] = useState({ name: "", category: "", deadline: "", statId: "" });
      const [showAddTask, setShowAddTask] = useState(false);
      const [newTask, setNewTask] = useState({ text: "", quadrant: 2, goalId: "", tag: "" });
      const [retroGood, setRetroGood] = useState("");
      const [retroBad, setRetroBad] = useState("");
      const [retroImprove, setRetroImprove] = useState("");

      const unlinkedTasks = tasks.filter((t) => !t.goalId);
      const tasksByGoal = useMemo(() => {
        const map = {};
        goals.forEach((g) => { map[g.id] = tasks.filter((t) => t.goalId === g.id); });
        return map;
      }, [goals, tasks]);

      const handleAddGoal = () => {
        if (!newGoal.name.trim()) return;
        addGoal({
          id: "g" + Date.now(),
          name: newGoal.name.trim(),
          category: newGoal.category.trim() || "기타",
          deadline: newGoal.deadline || "2026-12-31",
          progress: 0,
          statId: newGoal.statId || null,
          milestones: []
        });
        setNewGoal({ name: "", category: "", deadline: "", statId: "" });
        setShowAddGoal(false);
      };

      const startEditGoal = (g) => {
        setEditingGoalId(g.id);
        setEditGoalForm({
          name: g.name,
          category: g.category,
          deadline: g.deadline,
          progress: g.progress,
          statId: g.statId || ""
        });
      };
      const saveEditGoal = (id) => {
        const updates = {
          name: editGoalForm.name,
          category: editGoalForm.category,
          deadline: editGoalForm.deadline,
          statId: editGoalForm.statId || null
        };
        if (editGoalForm.tier) updates.tier = editGoalForm.tier;
        editGoal(id, updates);
        setEditingGoalId(null);
      };

      const handleAddTask = () => {
        if (!newTask.text.trim()) return;
        addTask({
          id: "t" + Date.now(),
          text: newTask.text.trim(),
          quadrant: Number(newTask.quadrant) || 2,
          goalId: newTask.goalId || null,
          questId: newTask.questId || null,
          tag: newTask.tag.trim() || "",
          dueDate: newTask.dueDate || "",
          done: false,
          time: ""
        });
        setNewTask({ text: "", quadrant: 2, goalId: "", questId: "", tag: "", dueDate: "" });
        setShowAddTask(false);
      };

      // 4분면 빈 영역 클릭으로 인라인 추가
      const [quadAddIn, setQuadAddIn] = useState(null); // quadrant id
      const [taskDragId, setTaskDragId] = useState(null);
      const [dragOverQuad, setDragOverQuad] = useState(null);
      const handleTaskDragStart = (taskId) => (e) => {
        setTaskDragId(taskId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
      };
      const handleTaskDragEnd = () => { setTaskDragId(null); setDragOverQuad(null); };
      const handleQuadDragOver = (quadId) => (e) => {
        if (!taskDragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverQuad(quadId);
      };
      const handleQuadDrop = (quadId) => (e) => {
        e.preventDefault();
        if (!taskDragId) return;
        const t = tasks.find(x => x.id === taskDragId);
        if (t && t.quadrant !== quadId) editTask(taskDragId, { quadrant: quadId });
        setTaskDragId(null);
        setDragOverQuad(null);
      };
      const [quadAddText, setQuadAddText] = useState("");

      // 할일 세부 편집 모달
      const [editingTaskId, setEditingTaskId] = useState(null);

      // 메인/사이드/도전 인라인 추가 텍스트
      const [questDraft, setQuestDraft] = useState({}); // {goalId+kind: text}

      // ── 목표 드래그앤드롭 순서 변경 ──
      const [dragId, setDragId] = useState(null);
      const [dragOverId, setDragOverId] = useState(null);
      const handleDragStart = (id) => (e) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", id); } catch (_) {}
      };
      const handleDragOver = (id) => (e) => {
        e.preventDefault();
        if (dragId && dragId !== id) setDragOverId(id);
      };
      const handleDrop = (targetId) => (e) => {
        e.preventDefault();
        if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
        const fromIdx = goals.findIndex(g => g.id === dragId);
        const toIdx = goals.findIndex(g => g.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return;
        const next = [...goals];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        setGoals(next);
        setDragId(null);
        setDragOverId(null);
      };
      const handleDragEnd = () => { setDragId(null); setDragOverId(null); };
      const getDraft = (gId, kind) => questDraft[gId + ":" + kind] || "";
      const setDraft = (gId, kind, v) => setQuestDraft(p => ({ ...p, [gId + ":" + kind]: v }));
      const addQuestItem = (gId, kind, value) => {
        const text = (value ?? getDraft(gId, kind)).trim();
        if (!text) return;
        const g = goals.find(x => x.id === gId);
        if (!g) return;
        if (kind === "main") {
          // 첫 단계만 active, 이후는 todo (현재 진행단계는 1개만)
          const hasActive = (g.milestones || []).some(m => m.status === "active");
          const status = (g.milestones || []).length === 0 ? "active" : (hasActive ? "todo" : "active");
          editGoal(gId, { milestones: [...(g.milestones || []), { id: "m" + Date.now(), name: text, status, xpReward: 150 }] });
        } else if (kind === "quest") {
          // 카운트 추측: 텍스트에 'N개/회/번/편' 패턴 있으면 target = N
          const m = text.match(/(\d+)\s*(개|회|번|편|장|분|시간|h)/);
          const target = m ? parseInt(m[1]) : 1;
          editGoal(gId, { quests: [...(g.quests || []), {
            id: "q" + Date.now(), name: text,
            current: 0, target, unit: m ? m[2] : "회",
            xpReward: target > 1 ? 300 : 80, xpPerStep: target > 1 ? 30 : 0,
            repeat: null, done: false
          }] });
        }
        setDraft(gId, kind, "");
      };
      const handleQuadAdd = (q) => {
        if (!quadAddText.trim()) { setQuadAddIn(null); return; }
        addTask({
          id: "t" + Date.now(),
          text: quadAddText.trim(),
          quadrant: q,
          goalId: null,
          tag: "",
          dueDate: "",
          done: false,
          time: ""
        });
        setQuadAddText("");
        setQuadAddIn(null);
      };

      // 회고: 1주에 1개. 이번주 회고가 이미 있으면 덮어쓰기 (수정).
      const thisWeekKey = "W" + getWeekNumber() + " · " + new Date().getFullYear();
      const existingThisWeek = retros.find(r => r.week === thisWeekKey);

      // 이번주 회고가 있으면 자동으로 입력란에 로드
      useEffect(() => {
        if (existingThisWeek && !retroGood && !retroBad && !retroImprove) {
          setRetroGood(existingThisWeek.good || "");
          setRetroBad(existingThisWeek.bad || "");
          setRetroImprove(existingThisWeek.improve || "");
        }
      }, [existingThisWeek?.id]);

      const saveRetro = () => {
        if (!retroGood && !retroBad && !retroImprove) return;
        const entry = {
          id: existingThisWeek ? existingThisWeek.id : "r" + Date.now(),
          week: thisWeekKey,
          date: getWeekRange(0),
          good: retroGood, bad: retroBad, improve: retroImprove,
          updatedAt: new Date().toISOString()
        };
        if (existingThisWeek) {
          setRetros((prev) => prev.map(r => r.id === existingThisWeek.id ? entry : r));
        } else {
          setRetros((prev) => [entry, ...prev]);
          setRetroGood(""); setRetroBad(""); setRetroImprove("");
        }
      };

      // 회고 자동 요약 계산
      const today = new Date();
      const dow = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      const weekEntries = weekDates.map((k) => dailyLog[k]).filter(Boolean);
      const completedThisWeek = tasks.filter((t) => t.done).length;
      const avgRate = weekEntries.length > 0
        ? Math.round(weekEntries.reduce((s, e) => s + e.rate, 0) / weekEntries.length)
        : 0;
      const bestGoal = goals.length > 0
        ? goals.reduce((a, b) => a.progress > b.progress ? a : b)
        : null;

      const fillRetroAI = () => {
        setRetroGood("이번 주 " + completedThisWeek + "개 태스크 완료" + (bestGoal ? ", " + bestGoal.name + " " + bestGoal.progress + "% 달성" : ""));
        setRetroBad("평균 달성률 " + avgRate + "% — 다음주 향상 필요");
      };

      return (
        <div className="panel-enter">
          <div className={"gtr-split" + (taskFullscreen ? " fullscreen" : "")} ref={gtrRef} style={{ position: "relative", gridTemplateColumns: taskFullscreen ? "100%" : `${colWidths[0]}% 6px ${colWidths[1]}% 6px ${colWidths[2]}%` }}>
            {taskFullscreen && (
              <>
                <button className="fs-exit-btn" onClick={() => setTaskFullscreen(false)} title="풀스크린 종료 (ESC)">✕</button>
                <div className="fs-arrow-zone left" onClick={() => cycleTab(-1)} title="이전 탭 (←)"><span className="fs-arrow">◀</span></div>
                <div className="fs-arrow-zone right" onClick={() => cycleTab(1)} title="다음 탭 (→)"><span className="fs-arrow">▶</span></div>
              </>
            )}
            <svg className="gtr-connections" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1, overflow: "visible" }}>
              {connPaths.filter(p => p.goalId === openGoalId).map((p) => (
                <g key={p.key}>
                  <path d={p.d} fill="none" stroke={p.color} strokeWidth="1.8" strokeOpacity={p.done ? 0.35 : 0.75} strokeDasharray={p.done ? "3 3" : "none"} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
                  <circle cx={p.gx} cy={p.gy} r="3" fill={p.color} opacity={p.done ? 0.5 : 1} />
                  <circle cx={p.tx} cy={p.ty} r="3" fill={p.color} opacity={p.done ? 0.5 : 1} />
                </g>
              ))}
            </svg>
            {/* ── LEFT: GOALS ── */}
            <div className="gtr-col goals" style={{ zoom: gtrZoom }}>
              <div className="gtr-col-head">
                <div className="gtr-col-title">
                  🎯 목표 <span className="gtr-col-count">{goals.length}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                  <div className="gtr-zoom" title="텍스트 크기 (90~150%) — 슬라이더 조정 후 적용 버튼 클릭">
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>🔍</span>
                    <input type="range" min="90" max="150" step="5" value={Math.round(pendingZoom * 100)} onChange={(e) => setPendingZoom(Number(e.target.value) / 100)} />
                    <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--accent)", minWidth: 32 }}>{Math.round(pendingZoom * 100)}%</span>
                    <button
                      className="gtr-zoom-apply"
                      disabled={pendingZoom === gtrZoom}
                      onClick={() => { setGtrZoom(pendingZoom); if (setSettings) setSettings(prev => ({ ...prev, gtrZoomLevel: pendingZoom })); }}
                      title="적용"
                    >적용</button>
                  </div>
                  <button className="gtr-btn-add" onClick={() => setShowAddGoal((v) => !v)}>
                    {showAddGoal ? "✕" : "+ 추가"}
                  </button>
                </div>
              </div>

              {showAddGoal && (
                <div className="inline-add-form">
                  <input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="목표 이름" autoFocus />
                  <div className="inline-add-form-row">
                    <input value={newGoal.category} onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })} placeholder="카테고리" />
                    <input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
                  </div>
                  <select value={newGoal.statId} onChange={(e) => setNewGoal({ ...newGoal, statId: e.target.value })}>
                    <option value="">연결 스탯 선택</option>
                    {stats.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                  </select>
                  <div className="inline-add-buttons">
                    <button onClick={() => setShowAddGoal(false)}>취소</button>
                    <button className="save" onClick={handleAddGoal}>저장</button>
                  </div>
                </div>
              )}

              {goals.map((g) => {
                const dday = calcDday(g.deadline);
                const gTasks = tasksByGoal[g.id] || [];
                const doneTasks = gTasks.filter((t) => t.done).length;
                const isOpen = openGoalId === g.id;
                const isEditing = editingGoalId === g.id;
                const linkedStat = g.statId ? stats.find((s) => s.id === g.statId) : null;
                return (
                  <div key={g.id} data-goal-id={g.id} data-conn-goal={g.id}
                    style={{ borderLeft: `4px solid ${goalColor(g.id)}` }}
                    className={"gmini" + (isOpen ? " open" : "") + (dragId === g.id ? " dragging" : "") + (dragOverId === g.id ? " drag-over" : "")}
                    draggable={!isEditing}
                    onDragStart={handleDragStart(g.id)}
                    onDragOver={handleDragOver(g.id)}
                    onDrop={handleDrop(g.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => !isEditing && setOpenGoalId(isOpen ? null : g.id)}>
                    <div className="gmini-head">
                      <div className="gmini-meta">
                        <div className="gmini-cat">{g.category}</div>
                        <div className="gmini-name">{g.name}</div>
                      </div>
                      <div className={"gmini-dday" + (dday <= 30 ? " urgent" : dday <= 90 ? " soon" : "")}>D-{dday}</div>
                    </div>
                    <div className="gmini-prog">
                      <div className="bar"><div className="bar-fill" style={{ width: g.progress + "%" }} /></div>
                      <span className="pct">{g.progress}%</span>
                    </div>
                    <div className="gmini-foot">
                      {linkedStat && <span className="gmini-stat-tag">{linkedStat.icon} {linkedStat.label}</span>}
                      <span className="gmini-task-count" style={{ marginLeft: "auto" }}>{doneTasks}/{gTasks.length} 할일</span>
                    </div>

                    {/* 수정 폼은 GoalEditModal로 이동됨 (이 컴포넌트 하단) */}


                    {isOpen && !isEditing && (() => {
                      const stages = g.milestones || [];
                      const activeStageIdx = stages.findIndex(m => m.status !== "done");
                      const visibleTasks = gTasks.slice(0, 3);
                      const moreTasks = gTasks.length - visibleTasks.length;
                      return (
                        <div className="gmini-expand" onClick={(e) => e.stopPropagation()}>
                          <div className="gmini-expand-grid">
                            {/* LEFT: 단계 + 퀘스트 */}
                            <div className="gmini-expand-col">
                              <div className="gmini-expand-col-title">📍 단계 ({stages.filter(m => m.status === "done").length}/{stages.length})</div>
                              {stages.length === 0 && <div className="gmini-expand-empty">단계 없음</div>}
                              {stages.map((m, i) => {
                                const cls = m.status === "done" ? "done" : (i === activeStageIdx ? "current-stage" : "todo");
                                return (
                                  <div key={m.id} className={"qb-row " + cls} onClick={(e) => { e.stopPropagation(); toggleStageInForm(g.id, m.id); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span className="qb-cb" style={{ width: 14, height: 14, border: "1.5px solid var(--border-strong)", borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>{m.status === "done" ? "✓" : ""}</span>
                                    <span className="qb-text" style={{ flex: 1, fontSize: 11 }}>{m.name}</span>
                                    <span className="qb-xp" style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>+150</span>
                                  </div>
                                );
                              })}

                              {/* 퀘스트 — 단계 아래 */}
                              {(() => {
                                const quests = g.quests || [];
                                return (
                                  <>
                                    <div className="gmini-expand-col-title" style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>💎 퀘스트 ({quests.filter(q => q.done).length}/{quests.length})</div>
                                    {quests.length === 0 && <div className="gmini-expand-empty">퀘스트 없음</div>}
                                    {quests.map((q) => {
                                      const target = q.target || 1;
                                      const cur = q.current || 0;
                                      const pct = q.done ? 100 : Math.min(100, Math.round((cur / target) * 100));
                                      return (
                                        <div key={q.id} className={"qb-row " + (q.done ? "done" : "active")} style={{ cursor: "default", display: "flex", alignItems: "center", gap: 8 }}>
                                          <span className="qb-cb" style={{ width: 14, height: 14, border: "1.5px solid var(--border-strong)", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); adjustQuestCount && adjustQuestCount(g.id, q.id, q.done ? -1 : +1); }} title={q.done ? "되돌리기" : "+1"}>{q.done ? "✓" : (q.repeat ? "🔁" : "")}</span>
                                          <span className="qb-text" style={{ flex: 1, fontSize: 11 }}>{q.name}</span>
                                          <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 10, color: q.done ? "var(--green)" : "var(--accent)", fontWeight: 700, minWidth: 40, textAlign: "right" }}>{q.done ? "완료" : cur + "/" + target}</span>
                                          {target > 1 && !q.done && (
                                            <div style={{ width: 36, height: 4, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                                              <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg, var(--accent-2), var(--accent))" }} />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                            {/* RIGHT: 연결 업무 (최대 3) */}
                            <div className="gmini-expand-col">
                              <div className="gmini-expand-col-title">⚡ 연결 업무 ({gTasks.filter(t => t.done).length}/{gTasks.length})</div>
                              {gTasks.length === 0 && <div className="gmini-expand-empty">연결된 업무 없음</div>}
                              {visibleTasks.map((t) => (
                                <div key={t.id} className={"gmini-expand-task" + (t.done ? " done" : "")}>
                                  <div className="cb" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} style={{ cursor: "pointer" }} />
                                  <span onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); }} style={{ flex: 1, cursor: "text" }}>{t.text}</span>
                                  <span className="qtag">Q{t.quadrant}</span>
                                </div>
                              ))}
                              {moreTasks > 0 && (
                                <div className="gmini-expand-more">+{moreTasks}개 더</div>
                              )}
                            </div>
                          </div>
                          <div className="gmini-actions">
                            <button className="gmini-act-btn" onClick={() => startEditGoal(g)}>✏️ 수정</button>
                            <button className="gmini-act-btn del" onClick={() => { if (confirm("삭제하시겠어요?")) deleteGoal(g.id); }}>🗑 삭제</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* ─── 목표 수정 풀스크린 모달 ─── */}
              {editingGoalId && (() => {
                const g = goals.find(x => x.id === editingGoalId);
                if (!g) return null;
                return (
                  <div className="gem-overlay" onClick={() => setEditingGoalId(null)}>
                    <div className="gem-card" onClick={(e) => e.stopPropagation()}>
                      <div className="gem-head">
                        <div className="gem-title">
                          <div className="gem-cat">{g.category || "목표"} · 수정</div>
                          <div className="gem-name-display">{g.name}</div>
                        </div>
                        <button className="gem-close" onClick={() => setEditingGoalId(null)} title="닫기 (변경사항은 자동 저장됨)">✕</button>
                      </div>

                      <div className="gem-body gem-body-grid">
                        <div className="gem-section basic-info">
                          <div className="gem-section-title">📝 기본 정보</div>
                          <div className="gem-field">
                            <label>목표 이름</label>
                            <input value={editGoalForm.name} onChange={(e) => setEditGoalForm({ ...editGoalForm, name: e.target.value })} placeholder="목표 이름" />
                          </div>
                          <div className="gem-field-row">
                            <div className="gem-field">
                              <label>카테고리</label>
                              <input value={editGoalForm.category} onChange={(e) => setEditGoalForm({ ...editGoalForm, category: e.target.value })} placeholder="예: CREATOR · 수익화" />
                            </div>
                            <div className="gem-field">
                              <label>마감일</label>
                              <input type="date" value={editGoalForm.deadline} onChange={(e) => setEditGoalForm({ ...editGoalForm, deadline: e.target.value })} />
                            </div>
                          </div>
                          <div className="gem-field-row">
                            <div className="gem-field">
                              <label>티어</label>
                              <select value={editGoalForm.tier || g.tier || "rare"} onChange={(e) => setEditGoalForm({ ...editGoalForm, tier: e.target.value })}>
                                <option value="legend">👑 Legend · +5000 XP</option>
                                <option value="epic">💜 Epic · +2500 XP</option>
                                <option value="rare">💎 Rare · +1000 XP</option>
                                <option value="normal">⚪ Normal · +400 XP</option>
                              </select>
                            </div>
                            <div className="gem-field">
                              <label>연결 스탯</label>
                              <select value={editGoalForm.statId} onChange={(e) => setEditGoalForm({ ...editGoalForm, statId: e.target.value })}>
                                <option value="">스탯 미연결</option>
                                {stats.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="gem-field" style={{ marginTop: 14 }}>
                            <label>색상 (목표 카드 · 연결선 · 업무 뱃지에 반영)</label>
                            <div className="goal-color-swatches">
                              {GOAL_COLORS.map((c) => {
                                const isSelected = (g.color || "") === c.value;
                                const previewColor = c.value || (() => {
                                  const idx = goals.findIndex(x => x.id === g.id);
                                  return `hsl(${(idx * 47) % 360}, 70%, 62%)`;
                                })();
                                return (
                                  <button
                                    key={c.value || "auto"}
                                    type="button"
                                    title={c.name + (c.value ? " " + c.value : " (인덱스 기반)")}
                                    onClick={() => editGoal(g.id, { color: c.value || null })}
                                    className={"goal-swatch" + (isSelected ? " selected" : "") + (!c.value ? " auto" : "")}
                                    style={{ background: previewColor }}
                                  >
                                    {!c.value && <span className="auto-mark">A</span>}
                                    {isSelected && <span className="check-mark">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 메인 단계 */}
                        <div className="gem-section main-stages">
                          <div className="quest-section-head" style={{ marginBottom: 8 }}>
                            <div>
                              <div className="quest-section-title main">📍 메인 단계 <span className="badge">🎯 {(g.milestones || []).filter(m => m.status === "done").length}/{(g.milestones || []).length}</span>
                                <span className="help-icon" onClick={(e) => { e.stopPropagation(); onOpenQuestGuide && onOpenQuestGuide(); }}>?</span>
                              </div>
                              <div className="quest-section-desc">순서대로 진행 · 각 +150 XP</div>
                            </div>
                          </div>
                          {(g.milestones || []).map((m, i) => (
                            <div key={m.id} className={"qm-row qm-with-date " + m.status}>
                              <span className="num">{i + 1}</span>
                              <span className="ck" onClick={(e) => { e.stopPropagation(); toggleStageInForm(g.id, m.id); }}>{m.status === "done" ? "✓" : ""}</span>
                              <input className="name" value={m.name} onChange={(e) => {
                                const newStages = (g.milestones || []).map(x => x.id === m.id ? { ...x, name: e.target.value } : x);
                                editGoal(g.id, { milestones: newStages });
                              }} />
                              <input type="date" className="qm-date" value={m.deadline || ""} onChange={(e) => {
                                const newStages = (g.milestones || []).map(x => x.id === m.id ? { ...x, deadline: e.target.value } : x);
                                editGoal(g.id, { milestones: newStages });
                              }} />
                              <span className="state">{m.status === "done" ? "완료" : m.status === "active" ? "진행중" : "예정"}</span>
                              <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, color: "var(--accent)", textAlign: "center" }}>+150</span>
                              <button className="del" onClick={(e) => {
                                e.stopPropagation();
                                editGoal(g.id, { milestones: (g.milestones || []).filter(x => x.id !== m.id) });
                              }}>×</button>
                            </div>
                          ))}
                          <div className="qm-add-row">
                            <span className="num">+</span>
                            <input
                              value={getDraft(g.id, "main")}
                              onChange={(e) => setDraft(g.id, "main", e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) addQuestItem(g.id, "main"); }}
                              placeholder="메인 단계 추가"
                            />
                            <button className="qm-add-btn" onClick={() => addQuestItem(g.id, "main")} disabled={!getDraft(g.id, "main").trim()}>추가</button>
                          </div>
                          {(g.milestones || []).length > 0 && (
                            <div className="main-bonus-banner">
                              <span>🎁 <strong>메인 전체 달성</strong> 시 보너스</span>
                              <span className="bonus-xp">+600 XP</span>
                            </div>
                          )}
                        </div>

                        {/* 퀘스트 */}
                        <div className="gem-section quests">
                          <div className="quest-section-head" style={{ marginBottom: 8 }}>
                            <div>
                              <div className="quest-section-title side">💎 퀘스트 <span className="badge">{(g.quests || []).filter(q => q.done).length}/{(g.quests || []).length}</span></div>
                              <div className="quest-section-desc">자유 진행 · 카운터(N/M) · 반복(🔁) 가능 · 카운트마다 XP</div>
                            </div>
                          </div>
                          {(g.quests || []).map((q) => (
                            <div key={q.id} className={"qm-row qm-quest qm-with-date " + (q.done ? "done" : "")}>
                              <span className="num">{q.repeat ? "🔁" : "💎"}</span>
                              <span className="ck" onClick={(e) => { e.stopPropagation(); adjustQuestCount && adjustQuestCount(g.id, q.id, q.done ? -1 : +1); }}>{q.done ? "✓" : ""}</span>
                              <input className="name" value={q.name} onChange={(e) => {
                                const newQ = (g.quests || []).map(x => x.id === q.id ? { ...x, name: e.target.value } : x);
                                editGoal(g.id, { quests: newQ });
                              }} />
                              <input type="date" className="qm-date" value={q.deadline || ""} onChange={(e) => {
                                const newQ = (g.quests || []).map(x => x.id === q.id ? { ...x, deadline: e.target.value } : x);
                                editGoal(g.id, { quests: newQ });
                              }} />
                              <div className="qm-counter">
                                <button className="qbp-btn" onClick={(e) => { e.stopPropagation(); adjustQuestCount && adjustQuestCount(g.id, q.id, -1); }}>−</button>
                                <input type="number" value={q.current} min="0" onChange={(e) => {
                                  const v = Math.max(0, Number(e.target.value) || 0);
                                  const newQ = (g.quests || []).map(x => x.id === q.id ? { ...x, current: v, done: v >= x.target } : x);
                                  editGoal(g.id, { quests: newQ });
                                }} />
                                <span style={{ color: "var(--text-4)", fontSize: 11 }}>/</span>
                                <input type="number" value={q.target} min="1" onChange={(e) => {
                                  const v = Math.max(1, Number(e.target.value) || 1);
                                  const newQ = (g.quests || []).map(x => x.id === q.id ? { ...x, target: v, done: x.current >= v } : x);
                                  editGoal(g.id, { quests: newQ });
                                }} />
                                <button className="qbp-btn" onClick={(e) => { e.stopPropagation(); adjustQuestCount && adjustQuestCount(g.id, q.id, +1); }}>+</button>
                              </div>
                              <select value={q.repeat || ""} onChange={(e) => {
                                const newQ = (g.quests || []).map(x => x.id === q.id ? { ...x, repeat: e.target.value || null } : x);
                                editGoal(g.id, { quests: newQ });
                              }} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-2)", fontSize: 11, padding: "3px 5px", fontFamily: "inherit", outline: "none" }}>
                                <option value="">1회</option>
                                <option value="weekly">🔁 주간</option>
                                <option value="monthly">🔁 월간</option>
                              </select>
                              <input type="number" className="xp-edit" value={q.xpReward || 100} title="완료 보너스 XP" onChange={(e) => {
                                const newQ = (g.quests || []).map(x => x.id === q.id ? { ...x, xpReward: Number(e.target.value) || 0 } : x);
                                editGoal(g.id, { quests: newQ });
                              }} />
                              <button className="del" onClick={(e) => {
                                e.stopPropagation();
                                editGoal(g.id, { quests: (g.quests || []).filter(x => x.id !== q.id) });
                              }}>×</button>
                            </div>
                          ))}
                          <div className="qm-add-row">
                            <span className="num">+</span>
                            <input
                              value={getDraft(g.id, "quest")}
                              onChange={(e) => setDraft(g.id, "quest", e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) addQuestItem(g.id, "quest"); }}
                              placeholder="퀘스트 추가 (예: 역사 롱폼 10개 업로드)"
                            />
                            <button className="qm-add-btn" onClick={() => addQuestItem(g.id, "quest")} disabled={!getDraft(g.id, "quest").trim()}>추가</button>
                          </div>
                        </div>
                      </div>

                      <div className="gem-foot">
                        <button className="gem-btn-cancel" onClick={() => setEditingGoalId(null)}>취소</button>
                        <button className="gem-btn-save" onClick={() => saveEditGoal(g.id)}>✓ 저장 후 닫기</button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 미연결 할일 */}
              <div className="unlinked-section">
                <div className="unlinked-section-title">⚡ 미연결 할 일 ({unlinkedTasks.length})</div>
                {unlinkedTasks.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)" }}>모든 할일이 목표에 연결됨</div>}
                {unlinkedTasks.map((t) => (
                  <div key={t.id} className={"unlinked-task" + (t.done ? " done" : "")} onClick={() => toggleTask(t.id)}>
                    <div className="cb" />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                    <span className="qtag">Q{t.quadrant}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gtr-resize-handle" onMouseDown={startResize(0)} title="드래그로 폭 조절" />

            {/* ── MIDDLE: TASKS (4탭) ── */}
            <div className="gtr-col tasks" style={{ zoom: gtrZoom }}>
              <div className="gtr-col-head" style={{ flexWrap: "wrap" }}>
                <div className="task-tabs-bar">
                  <button className={"task-tab-btn" + (taskTab === "eisen" ? " active" : "")} onClick={() => persistTaskTab("eisen")}>📋 4분면<span className="cnt">{tasks.length}</span></button>
                  <button className={"task-tab-btn" + (taskTab === "weekly" ? " active" : "")} onClick={() => persistTaskTab("weekly")}>📅 달력</button>
                  <button className={"task-tab-btn" + (taskTab === "field" ? " active" : "")} onClick={() => persistTaskTab("field")}>🎯 목표별</button>
                  <button className={"task-tab-btn" + (taskTab === "focus" ? " active" : "")} onClick={() => persistTaskTab("focus")}>🍅 집중</button>
                </div>
                <button className="task-fullscreen-btn" onClick={() => setTaskFullscreen(true)} title="풀스크린 모드" style={{ marginLeft: "auto" }}>⛶</button>
                <button className="gtr-btn-add" onClick={() => setShowAddTask((v) => !v)}>
                  {showAddTask ? "✕" : "+ 추가"}
                </button>
              </div>

              {showAddTask && (
                <div className="inline-add-form">
                  <input value={newTask.text} onChange={(e) => setNewTask({ ...newTask, text: e.target.value })} placeholder="할 일" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddTask()} />
                  <div className="inline-add-form-row">
                    <select value={newTask.quadrant} onChange={(e) => setNewTask({ ...newTask, quadrant: e.target.value })}>
                      <option value="1">Q1 · 긴급+중요</option>
                      <option value="2">Q2 · 중요</option>
                      <option value="3">Q3 · 긴급</option>
                      <option value="4">Q4 · 나중에</option>
                    </select>
                    <select value={newTask.goalId} onChange={(e) => setNewTask({ ...newTask, goalId: e.target.value, questId: "" })}>
                      <option value="">목표 미연결</option>
                      {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  {newTask.goalId && (() => {
                    const selGoal = goals.find(x => x.id === newTask.goalId);
                    const availQuests = (selGoal?.quests || []).filter(q => !q.done);
                    if (availQuests.length === 0) return null;
                    return (
                      <select value={newTask.questId || ""} onChange={(e) => setNewTask({ ...newTask, questId: e.target.value })}>
                        <option value="">✨ 연결 퀘스트 (선택) — 완료 시 자동 카운트</option>
                        {availQuests.map(q => (
                          <option key={q.id} value={q.id}>
                            💎 {q.name} ({q.current}/{q.target} {q.unit}){q.xpPerStep > 0 ? " +" + q.xpPerStep + " XP/회" : ""}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  <div className="inline-add-form-row">
                    <input value={newTask.tag} onChange={(e) => setNewTask({ ...newTask, tag: e.target.value })} placeholder="태그 (예: 유튜브)" />
                    <input type="date" value={newTask.dueDate || ""} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} placeholder="마감일" />
                  </div>
                  <div className="inline-add-buttons">
                    <button onClick={() => setShowAddTask(false)}>취소</button>
                    <button className="save" onClick={handleAddTask}>저장</button>
                  </div>
                </div>
              )}

              {taskTab === "eisen" && <div className="eisen-4">
                {QUADRANTS.map((q) => {
                  const qt = tasks.filter((t) => t.quadrant === q.id);
                  return (
                    <div key={q.id} className={"eq-cell" + (dragOverQuad === q.id ? " drag-over" : "")}
                      onDragOver={handleQuadDragOver(q.id)}
                      onDrop={handleQuadDrop(q.id)}
                      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverQuad(null); }}>
                      <div className="eq-cell-head">
                        <div className="eq-cell-title">
                          <span className={"qd " + q.dot} />{q.num} · {q.title}
                        </div>
                        <span className="eq-cell-count">{qt.filter((t) => t.done).length}/{qt.length}</span>
                      </div>
                      <div className="eq-cell-body" onClick={(e) => { if (e.target === e.currentTarget) { setQuadAddIn(q.id); setQuadAddText(""); } }} style={{ cursor: quadAddIn === q.id ? "default" : "text" }}>
                        {qt.map((t) => {
                          const g = t.goalId ? goals.find((x) => x.id === t.goalId) : null;
                          const dueLeft = t.dueDate ? calcDday(t.dueDate) : null;
                          const dueClass = dueLeft !== null && dueLeft <= 3 ? "urgent" : dueLeft !== null && dueLeft <= 7 ? "soon" : "";
                          return (
                            <div key={t.id} data-conn-task={t.id}
                              draggable
                              onDragStart={handleTaskDragStart(t.id)}
                              onDragEnd={handleTaskDragEnd}
                              className={"eq-task-row" + (t.done ? " done" : "") + (openGoalId && t.goalId !== openGoalId ? " conn-dim" : "") + (openGoalId && t.goalId === openGoalId ? " conn-active" : "") + (taskDragId === t.id ? " task-dragging" : "")}
                              style={t.goalId ? { boxShadow: `inset 3px 0 0 ${goalColor(t.goalId)}`, cursor: "grab" } : { cursor: "grab" }}>
                              <div className="cb" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} style={{ cursor: "pointer" }} title="완료 토글" />
                              <span className="eq-task-text" onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); }} style={{ cursor: "text" }} title="클릭으로 수정">{t.text}</span>
                              {t.dueDate && <span className={"task-due " + dueClass} style={{ marginRight: 4 }}>{(() => { const dd = calcDday(t.dueDate); return dd >= 0 ? "D-" + dd : "D+" + Math.abs(dd); })()}</span>}
                              {g && <span className="gtag" style={{ background: goalColor(g.id) + "22", color: goalColor(g.id), borderColor: goalColor(g.id) + "55" }}>{g.name.slice(0, 6)}</span>}
                              <button className="del-x" onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); }} title="세부 편집">✏</button>
                              <button className="del-x" onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}>×</button>
                            </div>
                          );
                        })}
                        {quadAddIn === q.id ? (
                          <input
                            autoFocus
                            value={quadAddText}
                            onChange={(e) => setQuadAddText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleQuadAdd(q.id); if (e.key === "Escape") { setQuadAddIn(null); setQuadAddText(""); } }}
                            onBlur={() => handleQuadAdd(q.id)}
                            placeholder="할 일 입력 후 Enter"
                            style={{ background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: 5, color: "var(--text-1)", fontFamily: "Geist, sans-serif", fontSize: 12.5, padding: "5px 8px", outline: "none", width: "100%", boxSizing: "border-box" }}
                          />
                        ) : (
                          qt.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "12px 0", textAlign: "center", fontStyle: "italic" }}>+ 클릭하여 추가</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>}

              {taskTab === "field" && <FieldTaskView tasks={tasks} goals={goals} stats={stats} toggleTask={toggleTask} setEditingTaskId={setEditingTaskId} deleteTask={deleteTask} goalColor={goalColor} addTask={addTask} />}

              {taskTab === "weekly" && <WeeklyTaskView tasks={tasks} goals={goals} stats={stats} toggleTask={toggleTask} setEditingTaskId={setEditingTaskId} goalColor={goalColor} settings={settings} setSettings={setSettings} />}

              {taskTab === "focus" && <FocusModeView tasks={tasks} goals={goals} stats={stats} toggleTask={toggleTask} settings={settings} setSettings={setSettings} addTask={addTask} setEditingTaskId={setEditingTaskId} />}
            </div>

            <div className="gtr-resize-handle" onMouseDown={startResize(1)} title="드래그로 폭 조절" />

            {/* ── RIGHT: RETRO ── */}
            <div className="gtr-col" style={{ zoom: gtrZoom }}>
              <div className="gtr-col-head">
                <div className="gtr-col-title">📝 회고 · W{getWeekNumber()}<span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--text-3)", marginLeft: 5, fontWeight: 400 }}>{getWeekRange(0)}</span></div>
                <button className="gtr-btn-add" onClick={saveRetro}>{existingThisWeek ? "✓ 수정" : "저장"}</button>
              </div>

              {existingThisWeek && (
                <div style={{ fontSize: 11.5, color: "var(--green)", padding: "4px 8px", background: "rgba(16,185,129,0.08)", borderRadius: 4, marginBottom: 8, fontFamily: "Geist Mono, monospace" }}>
                  ✓ 이번주 회고 저장됨 · 내용 수정 후 [수정] 클릭
                </div>
              )}

              <div className="retro-mini-summary">
                <div className="retro-mini-summary-title">📊 W{getWeekNumber()} ({getWeekRange(0)}) 자동 요약</div>
                <div className="retro-mini-row"><span className="lbl">완료 태스크</span><span className="val">{completedThisWeek}개</span></div>
                <div className="retro-mini-row"><span className="lbl">평균 달성률</span><span className="val">{avgRate}%</span></div>
                <div className="retro-mini-row"><span className="lbl">활동일</span><span className="val">{weekEntries.length}/7</span></div>
                {bestGoal && (
                  <div className="retro-mini-row"><span className="lbl">최고 진행</span><span className="val" style={{ fontSize: 11.5 }}>{bestGoal.name.slice(0, 12)} {bestGoal.progress}%</span></div>
                )}
              </div>

              <div className="retro-mini-label"><span style={{ color: "var(--green)" }}>●</span> 잘한 것</div>
              <textarea className="retro-mini-textarea" value={retroGood} onChange={(e) => setRetroGood(e.target.value)} placeholder="이번주 성과·뿌듯한 순간..." />

              <div className="retro-mini-label"><span style={{ color: "var(--red)" }}>●</span> 아쉬운 것</div>
              <textarea className="retro-mini-textarea" value={retroBad} onChange={(e) => setRetroBad(e.target.value)} placeholder="미완료·아쉬움..." />

              <div className="retro-mini-label"><span style={{ color: "var(--accent)" }}>●</span> 다음주 개선</div>
              <textarea className="retro-mini-textarea" value={retroImprove} onChange={(e) => setRetroImprove(e.target.value)} placeholder="개선 행동..." />

              <button className="retro-fill-ai" onClick={fillRetroAI}>✨ 자동 요약으로 초안 채우기</button>

              <div className="retro-history-mini">
                <div className="unlinked-section-title" style={{ marginBottom: 8 }}>📚 이전 회고 ({retros.length})</div>
                {retros.slice(0, 4).map((r) => (
                  <div key={r.id} className="retro-history-card">
                    <div className="retro-history-week">
                      <span>{r.week}</span>
                      <button onClick={() => setRetros((p) => p.filter((x) => x.id !== r.id))} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 0, fontSize: 13 }}>×</button>
                    </div>
                    {r.good && <div className="retro-history-text">✓ {r.good}</div>}
                    {r.improve && <div className="retro-history-text" style={{ color: "var(--accent)", marginTop: 3 }}>→ {r.improve}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 할일 세부 편집 모달 ── */}
          {editingTaskId && (() => {
            const t = tasks.find(x => x.id === editingTaskId);
            if (!t) return null;
            const linkedGoal = t.goalId ? goals.find(x => x.id === t.goalId) : null;
            const availQuests = (linkedGoal?.quests || []).filter(q => !q.done || q.id === t.questId);
            const linkedStat = linkedGoal?.statId ? stats.find(s => s.id === linkedGoal.statId) : null;
            const update = (k, v) => editTask(t.id, { [k]: v });
            const QUADS = {
              1: { num: "Q1", lbl: "긴급 · 중요", desc: "지금 처리해야 할 일", color: "#ef4444" },
              2: { num: "Q2", lbl: "중요", desc: "장기적으로 가치 있는 일", color: "#8b5cf6" },
              3: { num: "Q3", lbl: "긴급", desc: "당장 처리하지만 가치 낮음", color: "#f59e0b" },
              4: { num: "Q4", lbl: "나중에", desc: "지금은 우선순위 낮음", color: "#6b7280" }
            };
            const qInfo = QUADS[t.quadrant] || QUADS[2];
            const dday = t.dueDate ? calcDday(t.dueDate) : null;
            const xpPreview = t.quadrant === 1 ? 40 : 15;

            return (
              <div className="modal-overlay" onClick={() => setEditingTaskId(null)}>
                <div className="tem-modal" onClick={(e) => e.stopPropagation()} style={{ "--tem-q-color": qInfo.color }}>
                  {/* LEFT: 비주얼 사이드바 */}
                  <div className="tem-sidebar">
                    <div className="tem-q-num">{qInfo.num}</div>
                    <div className="tem-q-lbl">{qInfo.lbl}</div>
                    <div className="tem-q-desc">{qInfo.desc}</div>

                    <div className="tem-divider"></div>

                    <div className="tem-stat-block">
                      <div className="tem-stat-title">연결 정보</div>
                      {linkedGoal
                        ? <div className="tem-stat-row"><span className="ic">🎯</span>{linkedGoal.name}</div>
                        : <div className="tem-stat-row dim"><span className="ic">🎯</span>목표 미연결</div>}
                      {linkedStat
                        ? <div className="tem-stat-row"><span className="ic">{linkedStat.icon}</span>{linkedStat.label} (Lv.{statLevel(getStatTotalXp(linkedStat))})</div>
                        : null}
                      {dday !== null
                        ? <div className="tem-stat-row"><span className="ic">⏰</span>D-{dday} {dday <= 3 ? "(긴급)" : dday <= 7 ? "(임박)" : ""}</div>
                        : <div className="tem-stat-row dim"><span className="ic">⏰</span>마감일 없음</div>}
                      <div className="tem-stat-row"><span className="ic">⚡</span>+{xpPreview} XP 예정</div>
                      {t.questId && linkedGoal && (() => {
                        const q = (linkedGoal.quests || []).find(x => x.id === t.questId);
                        return q ? <div className="tem-stat-row"><span className="ic">💎</span>{q.name} {q.xpPerStep > 0 ? "(+" + q.xpPerStep + " XP)" : ""}</div> : null;
                      })()}
                      {t.done && <div className="tem-stat-row" style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}><span className="ic">✓</span>완료됨</div>}
                    </div>
                  </div>

                  {/* RIGHT: 폼 */}
                  <div className="tem-right">
                    <div className="tem-form">
                      <div className="tem-form-head">
                        <div className="tem-form-title">✏️ 할일 편집</div>
                        <button className="tem-close" onClick={() => setEditingTaskId(null)}>✕</button>
                      </div>

                      <div className="tem-field">
                        <label>할 일</label>
                        <input className="tem-input" type="text" value={t.text} onChange={(e) => update("text", e.target.value)} placeholder="할 일 내용" autoFocus />
                      </div>

                      <div className="tem-field-row">
                        <div className="tem-field">
                          <label>4분면</label>
                          <select className="tem-input" value={t.quadrant} onChange={(e) => update("quadrant", Number(e.target.value))}>
                            <option value="1">🔴 Q1 · 긴급 + 중요</option>
                            <option value="2">🟣 Q2 · 중요</option>
                            <option value="3">🟡 Q3 · 긴급</option>
                            <option value="4">⚪ Q4 · 나중에</option>
                          </select>
                        </div>
                        <div className="tem-field">
                          <label>연결 목표</label>
                          <select className="tem-input" value={t.goalId || ""} onChange={(e) => { update("goalId", e.target.value || null); update("questId", null); }}>
                            <option value="">미연결</option>
                            {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {linkedGoal && availQuests.length > 0 && (
                        <div className="tem-field">
                          <label>✨ 연결 퀘스트 (선택 시 완료 자동 카운트)</label>
                          <select className="tem-input" value={t.questId || ""} onChange={(e) => update("questId", e.target.value || null)}>
                            <option value="">선택 안 함</option>
                            {availQuests.map(q => (
                              <option key={q.id} value={q.id}>
                                💎 {q.name} ({q.current}/{q.target}{q.unit ? " " + q.unit : ""}){q.xpPerStep > 0 ? " +" + q.xpPerStep + " XP/회" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="tem-field-row">
                        <div className="tem-field">
                          <label>태그</label>
                          <input className="tem-input" type="text" value={t.tag || ""} onChange={(e) => update("tag", e.target.value)} placeholder="예: 유튜브" />
                        </div>
                        <div className="tem-field">
                          <label>마감일</label>
                          <input className="tem-input" type="date" value={t.dueDate || ""} onChange={(e) => update("dueDate", e.target.value)} />
                        </div>
                      </div>

                      <div className="tem-field">
                        <label>예정 시간</label>
                        <input className="tem-input" type="text" value={t.time || ""} onChange={(e) => update("time", e.target.value)} placeholder="HH:MM (선택)" />
                      </div>
                    </div>

                    <div className="tem-foot">
                      <button className="tem-btn-danger" onClick={() => { if (confirm("이 할일을 삭제할까요?")) { deleteTask(t.id); setEditingTaskId(null); } }}>🗑 삭제</button>
                      <button className="tem-btn-primary" onClick={() => setEditingTaskId(null)}>✓ 완료</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }


    /* ─── Stage 3: 데이터 + 헬퍼 ─── */
    const INITIAL_ITEMS = [
      {
        id: "i1",
        name: "Claude Max",
        emoji: "🤖",
        status: "equipped",
        description: "AI 코딩 어시스턴트. 바이브코딩 핵심 도구",
        buffs: [
          { type: "time", value: 20, unit: "h/월", desc: "시간 확보" },
          { type: "stat", statId: "dev", value: 30, unit: "%", desc: "개발 XP +30%" }
        ],
        debuffs: [
          { type: "money", value: 100000, unit: "원/월", desc: "월 구독비" }
        ],
        goalId: null,
        devProgress: 100,
        devTarget: ""
      },
      {
        id: "i2",
        name: "유튜브 편집 AI",
        emoji: "🎬",
        status: "developing",
        description: "자동 영상 편집 도구 (개발중)",
        buffs: [
          { type: "money", value: 500000, unit: "원/월", desc: "완료 시 수익" }
        ],
        debuffs: [],
        goalId: "g3",
        devProgress: 60,
        devTarget: "2026-09-30"
      }
    ];

    const ITEM_EMOJIS = ["🤖","🎬","💎","⚔️","🛡","🏹","📱","💻","🎨","📚","🔧","⚡","🔮","🌟","🎯","💼","🎪","🚀","🧪","🎵","📸","🖥","⌨️","🖱","🎮","📺","📡","🔬","🧬","💊","🏆","🥇","🎖","🏅","🎁","💝","🔑","🗝","💰","💵","💸"];

    function computeResources(baseResources, items) {
      const equipped = items.filter((i) => i.status === "equipped");
      let income = baseResources.money?.income || 0;
      let expenses = baseResources.money?.expenses || 0;
      let timeBuff = 0;
      let energyBuff = 0;
      const statBuffs = {};

      equipped.forEach((it) => {
        (it.buffs || []).forEach((b) => {
          if (b.type === "money") income += b.value;
          else if (b.type === "time") timeBuff += b.value;
          else if (b.type === "energy") energyBuff += b.value;
          else if (b.type === "stat" && b.statId) {
            statBuffs[b.statId] = (statBuffs[b.statId] || 0) + b.value;
          }
        });
        (it.debuffs || []).forEach((d) => {
          if (d.type === "money") expenses += d.value;
        });
      });

      return {
        money: { income, expenses, profit: income - expenses, baseIncome: baseResources.money?.income || 0, baseExpenses: baseResources.money?.expenses || 0 },
        time: { weeklyPool: baseResources.time?.weeklyPool || 72, used: baseResources.time?.used || 0, buff: timeBuff },
        energy: { weeklyPool: baseResources.energy?.weeklyPool || 100, used: baseResources.energy?.used || 0, buff: energyBuff },
        statBuffs
      };
    }

    /* ─── Gemini AI helpers ─── */
    function getGeminiSettings() {
      const s = loadLS("dreamboard_settings", INITIAL_SETTINGS);
      return {
        key: s.geminiKey || "",
        textModel: s.geminiTextModel || "gemini-2.5-flash",
        imageModel: s.geminiImageModel || "gemini-2.5-flash-image-preview"
      };
    }

    async function geminiTest(apiKey, model) {
      if (!apiKey) throw new Error("API Key 미설정");
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error("HTTP " + res.status + ": " + t.slice(0, 200));
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "응답 OK";
    }

    async function geminiSuggestTask(apiKey, taskText, model) {
      if (!apiKey) throw new Error("API Key 미설정");
      const m = model || getGeminiSettings().textModel;
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + apiKey;
      const prompt = "다음 할일에 대해 추정 XP(15~80), 에너지 소모(소=5/중=15/대=30), 예상 소요시간(분)을 JSON으로 답해. 예: {\"xp\":40,\"energy\":15,\"minutes\":60}\n할일: " + taskText;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
        })
      });
      if (!res.ok) throw new Error("API 오류 " + res.status);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      return JSON.parse(text);
    }

    async function geminiGenerateImage(apiKey, prompt, model) {
      if (!apiKey) throw new Error("API Key 미설정");
      const m = model || getGeminiSettings().imageModel;
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + apiKey;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "꿈을 상징하는 인스피레이션 이미지: " + prompt + ". 사실적이고 아름다운, 시네마틱한 스타일." }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
        })
      });
      if (!res.ok) {
        const errTxt = await res.text();
        let msg = errTxt.slice(0, 200);
        try { const j = JSON.parse(errTxt); msg = j.error?.message || msg; } catch (_) {}
        // 무료 티어 할당량 0 (limit: 0) → 결제 필요
        if (res.status === 429 && /limit:\s*0/.test(errTxt)) {
          throw new Error("⚠️ 이 이미지 모델은 무료 티어 미포함 (limit=0)\n→ Google Cloud 결제 활성화 필요: aistudio.google.com/app/apikey\n→ 또는 AI Studio에서 직접 생성 → 파일 업로드 사용\n[" + m + "]");
        }
        if (res.status === 429) {
          throw new Error("⏱️ 분당 요청 한도 초과 — 잠시 후 재시도\n[" + m + "]");
        }
        if (res.status === 403) {
          throw new Error("🚫 API 키 권한 없음 또는 모델 접근 차단\n[" + m + "] " + msg);
        }
        if (res.status === 404) {
          throw new Error("❌ 모델 없음 — 모델명 확인 또는 셧다운\n[" + m + "]");
        }
        throw new Error("[" + m + "] " + res.status + ": " + msg);
      }
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p.inlineData?.data) {
          return "data:" + (p.inlineData.mimeType || "image/png") + ";base64," + p.inlineData.data;
        }
      }
      throw new Error("응답에 이미지 없음 — 이 모델이 이미지 생성을 지원하지 않을 수 있습니다");
    }

    /* ─── 이미지 압축 (Canvas) ─── */
    /* 데이터 URL → JPEG 압축 (AI 생성 이미지를 Firestore 1MB 제한 내로) */
    function compressDataUrl(dataUrl, maxW = 1280, maxH = 800, quality = 0.88) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          const ratio = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    /* Firebase Storage 업로드 — Storage 미활성화 시 null 반환(호출부에서 base64 폴백) */
    async function uploadDreamImageToStorage(dataUrl, dreamId, uid) {
      if (!_storage) { console.warn("[DreamImg] _storage 없음 — base64 폴백"); return null; }
      if (!uid) { console.warn("[DreamImg] uid 없음 — base64 폴백"); return null; }
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const safeId = (dreamId || "dream") + "_" + Date.now();
        const path = "dreams/" + uid + "/" + safeId + ".jpg";
        console.log("[DreamImg] Storage 업로드 시도:", path, "(" + Math.round(blob.size / 1024) + "KB)");
        const ref = _storage.ref(path);
        await ref.put(blob, { contentType: "image/jpeg" });
        const url = await ref.getDownloadURL();
        console.log("[DreamImg] ✓ Storage 업로드 성공 →", url.slice(0, 80) + "...");
        return url;
      } catch (err) {
        console.warn("[DreamImg] ✗ Storage 업로드 실패 — base64 폴백. 원인:", err.code || err.name, err.message);
        console.warn("[DreamImg] → 해결: Firebase Console → Storage 활성화 + 규칙 설정 필요");
        return null;
      }
    }

    function compressImage(file, maxWidth = 1600, maxHeight = 1000, quality = 0.92) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let w = img.width, h = img.height;
            const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", quality));
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    /* ─── Stage 3: ResourcesItemsTab (실제 구현) ─── */
    /* ─── CharacterHero (Concept B): 큰 아바타 + 6각형 레이더 ─── */
    function CharacterHero({ stats, settings, setSettings, uid, onOpenStatModal, onOpenSettings }) {
      const fileRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState("");
      const [promptOpen, setPromptOpen] = useState(false);
      const [aiPrompt, setAiPrompt] = useState("");
      const [editingName, setEditingName] = useState(false);

      const totalLv = stats.reduce((a, s) => a + statLevel(getStatTotalXp(s)), 0);
      const totalXp = stats.reduce((a, s) => a + getStatTotalXp(s), 0);
      const maxXp = STAT_LEVEL_REQ[9] * 6;
      const xpPct = Math.min(100, Math.round((totalXp / maxXp) * 100));

      const life = calcLifeStats(settings?.birthDate, settings?.expectedLifespan, settings?.retireAge);
      const avatarUrl = settings?.characterAvatarUrl || "";
      const charName = settings?.characterName || "";

      const setSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

      const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          setBusy(true); setMsg("");
          const dataUrl = await compressImage(file, 1200, 1200, 0.92);
          const storageUrl = await uploadDreamImageToStorage(dataUrl, "char_" + (uid || "u"), uid);
          setSetting("characterAvatarUrl", storageUrl || dataUrl);
          setMsg(storageUrl ? "✓ Storage 업로드 완료" : "⚠ Storage 미활성 — base64 폴백");
          setTimeout(() => setMsg(""), 3000);
        } catch (err) {
          setMsg("업로드 실패: " + err.message);
        } finally {
          setBusy(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      };

      const runAi = async () => {
        const apiKey = loadLS("dreamboard_settings", {}).geminiKey || settings?.geminiKey || "";
        if (!apiKey) {
          setMsg("⚙️ 설정에서 Gemini API Key 먼저 입력하세요");
          setTimeout(() => setMsg(""), 3000);
          return;
        }
        const promptText = aiPrompt.trim() || (charName ? charName + " RPG 캐릭터 초상화" : "RPG 게임 캐릭터 초상화, 판타지 스타일");
        try {
          setBusy(true); setMsg("");
          const rawUrl = await geminiGenerateImage(apiKey, promptText, settings?.geminiImageModel);
          const compressed = await compressDataUrl(rawUrl, 1024, 1024, 0.88);
          const storageUrl = await uploadDreamImageToStorage(compressed, "char_" + (uid || "u"), uid);
          setSetting("characterAvatarUrl", storageUrl || compressed);
          setPromptOpen(false);
          setAiPrompt("");
          setMsg(storageUrl ? "✓ AI 생성 + Storage 업로드 완료" : "⚠ Storage 미활성 — base64 폴백");
          setTimeout(() => setMsg(""), 3000);
        } catch (err) {
          setMsg(err.message);
          setTimeout(() => setMsg(""), 5000);
        } finally {
          setBusy(false);
        }
      };

      // 6각형 레이더 — 메인 6 스탯
      const MAIN_STAT_IDS = ["youtube", "estate", "dev", "english", "health", "finance"];
      const orderedStats = MAIN_STAT_IDS
        .map(sid => stats.find(s => s.id === sid))
        .filter(Boolean);
      // 보조 스탯 (메인 6개 이외)
      const auxStats = stats.filter(s => !MAIN_STAT_IDS.includes(s.id));
      const r = 130; // 외곽 반지름
      const pts = (factor) => orderedStats.map((s, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2 / 6); // 위에서 시작
        const lv = statLevel(getStatTotalXp(s));
        const v = factor === 1 ? r : (factor === 0 ? 0 : (lv / 10) * r);
        return [Math.cos(angle) * v, Math.sin(angle) * v];
      });
      const labelPos = (extra) => orderedStats.map((s, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2 / 6);
        return [Math.cos(angle) * (r + extra), Math.sin(angle) * (r + extra)];
      });
      const gridPolygon = (factor) => orderedStats.map((_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2 / 6);
        return Math.cos(angle) * r * factor + "," + Math.sin(angle) * r * factor;
      }).join(" ");
      const dataPoints = pts("data");
      const labels = labelPos(30);

      return (
        <div className="char-hero">
          <div className="ch-avatar-block">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            <div className="ch-avatar" onClick={() => !busy && fileRef.current?.click()} title="클릭으로 파일 업로드">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ch-avatar-placeholder">🦸</span>}
              {busy && <div className="ch-busy">처리중...</div>}
            </div>
            <div className="ch-name-row">
              {editingName ? (
                <input
                  autoFocus
                  value={charName}
                  onChange={(e) => setSetting("characterName", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
                  onBlur={() => setEditingName(false)}
                  placeholder="캐릭터 이름"
                  className="ch-name-input"
                />
              ) : (
                <div className="ch-name" onClick={() => setEditingName(true)}>{charName || "이름 없음"} <span className="ch-name-edit">✎</span></div>
              )}
            </div>
            <div className="ch-lv">Lv.{totalLv}<span className="ch-lv-sub"> / 60</span></div>
            <div className="ch-xp-bar"><div style={{ width: xpPct + "%" }} /></div>
            <div className="ch-xp-txt">{totalXp.toLocaleString()} XP · 만렙까지 {xpPct}%</div>

            <div className="ch-actions">
              <button className="ch-btn" disabled={busy} onClick={() => fileRef.current?.click()}>📁 업로드</button>
              <button className="ch-btn ai" disabled={busy} onClick={() => { setPromptOpen(v => !v); if (!aiPrompt) setAiPrompt(charName ? charName + " RPG 캐릭터 초상화" : ""); }}>✨ AI 생성</button>
            </div>
            {promptOpen && (
              <div className="ch-prompt">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="예: 슈트 입은 30대 남성, 사이버펑크 스타일"
                  onKeyDown={(e) => { if (e.key === "Enter") runAi(); }}
                />
                <button className="ch-btn ai" disabled={busy} onClick={runAi}>{busy ? "생성중..." : "생성"}</button>
              </div>
            )}
            {msg && <div className="ch-msg">{msg}</div>}

            <div className="ch-edit-row">
              <button className="ch-btn-link" onClick={onOpenStatModal}>✏ 스탯 수정</button>
              <button className="ch-btn-link" onClick={onOpenSettings}>🕯️ 인생 설정</button>
            </div>
          </div>

          <div className="ch-radar-block">
            <div className="ch-radar-title">⚔️ 능력치 레이더</div>
            <svg viewBox="-200 -180 400 360" className="ch-radar-svg">
              <defs>
                <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4"/>
                </linearGradient>
              </defs>
              {/* 6각형 가이드 (4단계) */}
              {[0.25, 0.5, 0.75, 1].map(f => (
                <polygon key={f} points={gridPolygon(f)} fill="none" stroke="var(--bg-3)" strokeWidth="1"/>
              ))}
              {/* 축선 */}
              {orderedStats.map((s, i) => {
                const [x, y] = pts(1)[i];
                return <line key={i} x1="0" y1="0" x2={x} y2={y} stroke="var(--bg-3)" strokeWidth="1"/>;
              })}
              {/* 실제 데이터 다각형 */}
              <polygon
                points={dataPoints.map(p => p[0] + "," + p[1]).join(" ")}
                fill="url(#radarGrad)"
                stroke="var(--accent)"
                strokeWidth="2"
                style={{ filter: "drop-shadow(0 0 8px var(--accent-glow))" }}
              />
              {/* 꼭지점 표시 */}
              {dataPoints.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--accent)" />
              ))}
              {/* 라벨 */}
              {orderedStats.map((s, i) => {
                const [lx, ly] = labels[i];
                const anchor = Math.abs(lx) < 5 ? "middle" : (lx > 0 ? "start" : "end");
                const lv = statLevel(getStatTotalXp(s));
                return (
                  <g key={s.id}>
                    <text x={lx} y={ly - 4} textAnchor={anchor} fill="var(--text-2)" fontSize="13" fontWeight="600">{s.icon} {s.label}</text>
                    <text x={lx} y={ly + 12} textAnchor={anchor} fill="var(--accent)" fontSize="12" fontWeight="700" fontFamily="Geist Mono, monospace">Lv.{lv}</text>
                  </g>
                );
              })}
            </svg>
            {life && (
              <div className="ch-life-strip">
                <span>🕯️ <strong>{life.age}세</strong> / {settings.expectedLifespan}세</span>
                <span style={{ color: "var(--text-3)" }}>· {Math.round(life.lifeProgress * 100)}% 살았음</span>
                {life.inGolden && <span style={{ color: "var(--amber)", fontWeight: 700 }}>· ✨ 황금기 진행중</span>}
              </div>
            )}

            {/* 보조 스탯 (메인 6 외 추가) */}
            {auxStats.length > 0 && (
              <div className="ch-aux-stats">
                <div className="ch-aux-title">🎯 보조 스탯 ({auxStats.length})</div>
                <div className="ch-aux-grid">
                  {auxStats.map(s => {
                    const tx = getStatTotalXp(s);
                    const lv = statLevel(tx);
                    const prog = statLevelProgress(tx);
                    return (
                      <div key={s.id} className="ch-aux-card" onClick={onOpenStatModal} title="클릭으로 편집">
                        <div className="ch-aux-row">
                          <span className="ch-aux-icon">{s.icon}</span>
                          <span className="ch-aux-name">{s.label}</span>
                          <span className="ch-aux-lv">Lv.{lv}</span>
                        </div>
                        <div className="ch-aux-bar"><div style={{ width: (prog.pct || 0) + "%" }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    /* ─── CharacterSidebar — ResourcesItemsTab 좌측 사이드바용 캐릭터 카드 ─── */
    function CharacterSidebar({ stats, settings, setSettings, uid, totalLv, totalXp, xpPct }) {
      const fileRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState("");
      const [promptOpen, setPromptOpen] = useState(false);
      const [aiPrompt, setAiPrompt] = useState("");
      const [editingName, setEditingName] = useState(false);
      const [showActions, setShowActions] = useState(false);
      const avatarUrl = settings?.characterAvatarUrl || "";
      const charName = settings?.characterName || "";
      const setSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

      const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          setBusy(true); setMsg("");
          const dataUrl = await compressImage(file, 1200, 1200, 0.92);
          const storageUrl = await uploadDreamImageToStorage(dataUrl, "char_" + (uid || "u"), uid);
          setSetting("characterAvatarUrl", storageUrl || dataUrl);
          setMsg(storageUrl ? "✓ 업로드 완료" : "⚠ base64 폴백");
          setTimeout(() => setMsg(""), 2500);
        } catch (err) { setMsg("실패: " + err.message); }
        finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
      };
      const runAi = async () => {
        const apiKey = loadLS("dreamboard_settings", {}).geminiKey || settings?.geminiKey || "";
        if (!apiKey) { setMsg("⚙️ Gemini API Key 먼저"); setTimeout(() => setMsg(""), 3000); return; }
        const promptText = aiPrompt.trim() || (charName ? charName + " RPG 캐릭터 초상화" : "RPG 캐릭터 초상화");
        try {
          setBusy(true); setMsg("");
          const rawUrl = await geminiGenerateImage(apiKey, promptText, settings?.geminiImageModel);
          const compressed = await compressDataUrl(rawUrl, 1024, 1024, 0.88);
          const storageUrl = await uploadDreamImageToStorage(compressed, "char_" + (uid || "u"), uid);
          setSetting("characterAvatarUrl", storageUrl || compressed);
          setPromptOpen(false); setAiPrompt("");
          setMsg(storageUrl ? "✓ AI 생성 완료" : "⚠ base64 폴백");
          setTimeout(() => setMsg(""), 2500);
        } catch (err) { setMsg(err.message); setTimeout(() => setMsg(""), 4000); }
        finally { setBusy(false); }
      };

      return (
        <div className="ri2-sb-card accent">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <div className="ri2-avatar" onDoubleClick={() => setShowActions(v => !v)} title="더블클릭으로 업로드/AI 메뉴 열기">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span style={{ fontSize: 56 }}>🦸</span>}
            {busy && <div className="ri2-busy">처리중...</div>}
            {showActions && <div className="ri2-avatar-hint">✏</div>}
          </div>
          <div className="ri2-name">
            {editingName ? (
              <input autoFocus value={charName} onChange={(e) => setSetting("characterName", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }} onBlur={() => setEditingName(false)} placeholder="이름" className="ri2-name-input" />
            ) : (
              <span onClick={() => setEditingName(true)}>{charName || "이름 없음"} <span style={{ color: "var(--text-4)", fontSize: 10 }}>✎</span></span>
            )}
          </div>
          <div className="ri2-lv">Lv.{totalLv}</div>
          <div className="ri2-lv-sub">/ 60 만렙</div>
          <div className="ri2-xp-bar"><div style={{ width: xpPct + "%" }} /></div>
          <div className="ri2-xp-txt">{totalXp.toLocaleString()} XP · {xpPct}%</div>
          {showActions && (
            <div className="ri2-sb-actions">
              <button className="sb-btn" disabled={busy} onClick={() => fileRef.current?.click()}>📁 업로드</button>
              <button className="sb-btn ai" disabled={busy} onClick={() => { setPromptOpen(v => !v); if (!aiPrompt) setAiPrompt(charName ? charName + " RPG 캐릭터 초상화" : ""); }}>✨ AI</button>
            </div>
          )}
          {showActions && promptOpen && (
            <div className="ri2-sb-prompt">
              <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="프롬프트" onKeyDown={(e) => { if (e.key === "Enter") runAi(); }} />
              <button className="sb-btn ai" disabled={busy} onClick={runAi}>{busy ? "..." : "GO"}</button>
            </div>
          )}
          {msg && <div className="ri2-sb-msg">{msg}</div>}
        </div>
      );
    }

    function ResourcesItemsTab({ items, setItems, resources, setResources, goals, stats, settings, setSettings, finance, setFinance, onOpenFinance, onOpenStatModal, onOpenSettings, uid, highlightSection, onHighlightConsumed, onOpenFinGoals }) {
      const [selectedItem, setSelectedItem] = useState(null);
      const [filter, setFilter] = useState("all");
      const [editingAssetId, setEditingAssetId] = useState(null);

      const computed = useMemo(() => computeResources(resources, items), [resources, items]);
      const fin = finance || INITIAL_FINANCE;

      // 재무 요약
      const totalAssets = sumAssets(fin);
      const totalIncome = sumIncome(fin, items);
      const totalIncomeActual = sumIncomeActual(fin);
      const totalExpense = sumExpense(fin, items);
      const totalExpenseActual = sumExpenseActual(fin);
      const profitExpected = totalIncome - totalExpense;
      const profitActual = totalIncomeActual - totalExpenseActual;

      const addAsset = (cat) => {
        const id = "a" + Date.now();
        setFinance(prev => ({ ...prev, assets: [...(prev.assets || []), { id, category: cat, name: "새 항목", value: 0, note: "" }] }));
        setEditingAssetId(id);
      };
      const updateAsset = (id, updates) => {
        setFinance(prev => ({ ...prev, assets: (prev.assets || []).map(a => a.id === id ? { ...a, ...updates } : a) }));
      };
      const deleteAsset = (id) => {
        if (!confirm("자산 항목을 삭제하시겠어요?")) return;
        setFinance(prev => ({ ...prev, assets: (prev.assets || []).filter(a => a.id !== id) }));
      };

      const filteredItems = filter === "all" ? items : items.filter((i) => i.status === filter);
      const totalSlots = 32; // 8x4
      const slots = Array.from({ length: totalSlots }, (_, i) => filteredItems[i] || null);

      const addItem = () => {
        const id = "i" + Date.now();
        const newItem = {
          id,
          name: "새 아이템",
          emoji: "💎",
          status: "stored",
          description: "",
          buffs: [],
          debuffs: [],
          goalId: null,
          devProgress: 0,
          devTarget: ""
        };
        setItems((prev) => [...prev, newItem]);
        setSelectedItem(newItem);
      };

      const updateItem = (id, updates) => {
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...updates } : i));
        if (selectedItem?.id === id) setSelectedItem((prev) => ({ ...prev, ...updates }));
      };
      const deleteItem = (id) => {
        if (!confirm("아이템을 삭제하시겠어요?")) return;
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedItem(null);
      };

      const counts = {
        all: items.length,
        equipped: items.filter((i) => i.status === "equipped").length,
        developing: items.filter((i) => i.status === "developing").length,
        stored: items.filter((i) => i.status === "stored").length
      };

      const updateBase = (key, value) => {
        setResources((prev) => ({
          ...prev,
          money: { ...prev.money, [key]: Number(value) || 0 }
        }));
      };

      const energyPct = Math.round((computed.energy.used / (computed.energy.weeklyPool + computed.energy.buff)) * 100);
      const timePct = Math.round((computed.time.used / (computed.time.weeklyPool + computed.time.buff)) * 100);

      // 수입을 주수익/부수익으로 분류 (regular = 주, irregular = 부)
      const mainIncomes = (fin.incomes || []).filter(i => i.category === "regular");
      const sideIncomes = (fin.incomes || []).filter(i => i.category !== "regular");
      const mainIncomeSum = mainIncomes.reduce((s, i) => s + (i.expected || 0), 0);
      const sideIncomeSum = sideIncomes.reduce((s, i) => s + (i.expected || 0), 0);
      const totalDebts = sumDebts(fin);
      const netWorth = totalAssets - totalDebts;
      const life = calcLifeStats(settings?.birthDate, settings?.expectedLifespan, settings?.retireAge);

      // 하이라이트 섹션 → 스크롤 + 펄스
      const sectionRefs = {
        assets: useRef(null),
        debts: useRef(null),
        "main-income": useRef(null),
        "side-income": useRef(null),
        expenses: useRef(null),
        "net-worth": useRef(null)
      };
      const [pulseSection, setPulseSection] = useState(null);
      useEffect(() => {
        if (!highlightSection) return;
        const ref = sectionRefs[highlightSection];
        if (ref?.current) {
          ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
          setPulseSection(highlightSection);
          setTimeout(() => setPulseSection(null), 2000);
        }
        onHighlightConsumed && onHighlightConsumed();
      }, [highlightSection]);

      // CharacterHero를 사이드바용으로 그대로 사용하기 어려우니 별도 인라인 렌더
      const totalLv = stats.reduce((a, s) => a + statLevel(getStatTotalXp(s)), 0);
      const totalXp = stats.reduce((a, s) => a + getStatTotalXp(s), 0);
      const maxXp = STAT_LEVEL_REQ[9] * 6;
      const xpPct = Math.min(100, Math.round((totalXp / maxXp) * 100));
      const MAIN_STAT_IDS = ["youtube", "estate", "dev", "english", "health", "finance"];
      const orderedStats = MAIN_STAT_IDS.map(sid => stats.find(s => s.id === sid)).filter(Boolean);
      const auxStats = stats.filter(s => !MAIN_STAT_IDS.includes(s.id));

      return (
        <div className="panel-enter">
          <div className="ri2-layout">
            {/* ━━━━ SIDEBAR (280px sticky) ━━━━ */}
            <aside className="ri2-sidebar">
              {/* 캐릭터 카드 */}
              <CharacterSidebar stats={stats} settings={settings} setSettings={setSettings} uid={uid} totalLv={totalLv} totalXp={totalXp} xpPct={xpPct} />

              {/* 능력치 */}
              <div className="ri2-sb-card">
                <div className="ri2-sb-title">⚔️ 능력치 ({orderedStats.length}) <span className="edit-link" onClick={onOpenStatModal}>편집 →</span></div>
                {orderedStats.map(s => {
                  const tx = getStatTotalXp(s);
                  const lv = statLevel(tx);
                  const prog = statLevelProgress(tx);
                  return (
                    <React.Fragment key={s.id}>
                      <div className="ri2-stat-line">
                        <span className="ic">{s.icon}</span>
                        <span className="nm">{s.label}</span>
                        <span className="lv">Lv.{lv}</span>
                      </div>
                      <div className="ri2-stat-bar"><div style={{ width: (prog.pct || 0) + "%" }} /></div>
                    </React.Fragment>
                  );
                })}
                {auxStats.length > 0 && (
                  <>
                    <div className="ri2-sb-divider"></div>
                    <div className="ri2-sb-subtitle">보조 ({auxStats.length})</div>
                    {auxStats.map(s => {
                      const lv = statLevel(getStatTotalXp(s));
                      return (
                        <div key={s.id} className="ri2-stat-line">
                          <span className="ic">{s.icon}</span>
                          <span className="nm">{s.label}</span>
                          <span className="lv">Lv.{lv}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* 자원 */}
              <div className="ri2-sb-card">
                <div className="ri2-sb-title">⚡ 자원</div>
                <div className="ri2-res-row">
                  <div className="head"><span>⚡ 에너지</span><span className="v">{computed.energy.used} / {computed.energy.weeklyPool + computed.energy.buff}</span></div>
                  <div className="ri2-res-bar"><div className={energyPct > 80 ? "warn" : ""} style={{ width: Math.min(100, energyPct) + "%" }} /></div>
                  <div className="sub">남은 {computed.energy.weeklyPool + computed.energy.buff - computed.energy.used}</div>
                </div>
                <div className="ri2-res-row">
                  <div className="head"><span>⏰ 시간</span><span className="v">{computed.time.used.toFixed(1)} / {computed.time.weeklyPool + computed.time.buff}h</span></div>
                  <div className="ri2-res-bar"><div className={timePct > 80 ? "warn" : ""} style={{ width: Math.min(100, timePct) + "%" }} /></div>
                  {computed.time.buff > 0 && <div className="sub">기본 {computed.time.weeklyPool}h + 아이템 <strong style={{ color: "var(--green)" }}>+{computed.time.buff}h</strong></div>}
                </div>
                {Object.keys(computed.statBuffs).length > 0 && (
                  <>
                    <div className="ri2-sb-divider"></div>
                    <div className="ri2-sb-subtitle">📈 스탯 버프</div>
                    {Object.entries(computed.statBuffs).map(([sid, v]) => {
                      const s = stats.find((x) => x.id === sid);
                      return (
                        <div key={sid} className="ri2-stat-line">
                          <span className="nm" style={{ paddingLeft: 0 }}>{s ? s.icon + " " + s.label : sid}</span>
                          <span className="lv" style={{ color: "var(--green)" }}>+{v}%</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* 인생 */}
              {life && (
                <div className="ri2-sb-card">
                  <div className="ri2-sb-title">🕯️ 인생 <span className="edit-link" onClick={onOpenSettings}>편집 →</span></div>
                  <div className="ri2-res-row">
                    <div className="head"><span>나이</span><span className="v">{life.age} / {settings.expectedLifespan}</span></div>
                    <div className="ri2-res-bar"><div className="amber" style={{ width: Math.min(100, life.livedPercent || 0) + "%" }} /></div>
                    <div className="sub">남은 {life.remainingYears}년{life.inGolden ? " · ✨ 황금기" : ""}</div>
                  </div>
                </div>
              )}
            </aside>

            {/* ━━━━ MAIN AREA ━━━━ */}
            <main className="ri2-main">

              {/* 💰 매거진 듀얼 히어로 + 미니 4-col */}
              <div className="ri2-sec-head"><span className="h">💰 재무 한눈에</span><span className="sub">카드 클릭 → 풀스크린 모달</span></div>
              {(() => {
                // 주/부 수입 — incomeSections segment 기반 (없으면 regular/irregular 카테고리로 폴백)
                const sections = (settings.incomeSections && settings.incomeSections.length >= 2) ? settings.incomeSections : INITIAL_SETTINGS.incomeSections;
                const incomesArr = fin.incomes || [];
                const hasSegments = incomesArr.some(i => i.segment);
                const primaryIncomeSum = hasSegments
                  ? incomesArr.filter(i => (i.segment || "primary") === sections[0].id).reduce((s, i) => s + (i.actual || i.expected || 0), 0)
                  : mainIncomeSum;
                const secondaryIncomeSum = hasSegments
                  ? incomesArr.filter(i => (i.segment || "primary") === sections[1].id).reduce((s, i) => s + (i.actual || i.expected || 0), 0)
                  : sideIncomeSum;
                const monthlyIncomeAct = totalIncomeActual || totalIncome;
                const monthlySavings = profitActual;
                return (
                  <>
                    <div className="mag-hero">
                      <div ref={sectionRefs["net-worth"]} className={"mag-card net" + (pulseSection === "net-worth" ? " pulse" : "")} onClick={() => onOpenFinance("summary")}>
                        <div className="mag-tag">YOUR NET WORTH</div>
                        <div className="mag-lbl">💎 순자산 (자산 − 부채)</div>
                        <div className="mag-val">{fmtKRShort(netWorth)}<span className="u">원</span></div>
                        <div className="mag-foot">
                          <div className="mag-foot-item"><div className="l">자산</div><div className="v green">{fmtKRShort(totalAssets)}</div></div>
                          <div className="mag-foot-item"><div className="l">부채</div><div className="v red">{totalDebts > 0 ? "-" + fmtKRShort(totalDebts) : "0"}</div></div>
                          <div className="mag-foot-item"><div className="l">자산 비중</div><div className="v gold">{totalAssets > 0 ? Math.round((netWorth / totalAssets) * 100) : 0}%</div></div>
                        </div>
                      </div>
                      <div className="mag-card income" onClick={() => onOpenFinance("incomes")}>
                        <div className="mag-tag">MONTHLY INCOME</div>
                        <div className="mag-lbl">💼 월 수입 (실제 입금)</div>
                        <div className="mag-val">+{fmtKRShort(monthlyIncomeAct).replace(/^\+/, "")}<span className="u">{monthlyIncomeAct >= 100000000 ? "" : "원"}</span></div>
                        <div className="mag-foot">
                          <div className="mag-foot-item"><div className="l">{sections[0].name}</div><div className="v gold">{fmtKRShort(primaryIncomeSum)}</div></div>
                          <div className="mag-foot-item"><div className="l">{sections[1].name}</div><div className="v gold">{fmtKRShort(secondaryIncomeSum)}</div></div>
                          <div className="mag-foot-item"><div className="l">월 Net</div><div className={"v " + (monthlySavings >= 0 ? "green" : "red")}>{fmtKRShortSigned(monthlySavings)}</div></div>
                        </div>
                      </div>
                    </div>
                    <div className="mag-stats-row">
                      <div ref={sectionRefs.assets} className={"mag-stat assets" + (pulseSection === "assets" ? " pulse" : "")} onClick={() => onOpenFinance("assets")}>
                        <div className="mag-stat-head"><div className="mag-stat-lbl">🏦 자산</div><div className="mag-stat-arrow">›</div></div>
                        <div className="mag-stat-val green">{fmtKRShort(totalAssets)}</div>
                        <div className="mag-stat-sub">{(fin.assets || []).length}건 · {Object.entries(ASSET_CATS).filter(([c]) => sumAssets(fin, c) > 0).map(([c, l]) => l.replace(/^[^ ]+ /, "")).join(" + ") || "없음"}</div>
                      </div>
                      <div ref={sectionRefs.debts} className={"mag-stat debts" + (pulseSection === "debts" ? " pulse" : "")} onClick={() => onOpenFinance("debts")}>
                        <div className="mag-stat-head"><div className="mag-stat-lbl">🚨 부채</div><div className="mag-stat-arrow">›</div></div>
                        <div className="mag-stat-val red">{totalDebts > 0 ? "-" + fmtKRShort(totalDebts) : "0"}</div>
                        <div className="mag-stat-sub">{(fin.debts || []).length > 0 ? (fin.debts || []).length + "건 · 대출 + 보증금 등" : "부채 없음"}</div>
                      </div>
                      <div className="mag-stat savings" onClick={() => onOpenFinance("incomes")}>
                        <div className="mag-stat-head"><div className="mag-stat-lbl">🪙 월 저축</div><div className="mag-stat-arrow">›</div></div>
                        <div className={"mag-stat-val " + (monthlySavings >= 0 ? "blue" : "red")}>{fmtKRShortSigned(monthlySavings)}</div>
                        <div className="mag-stat-sub">잉여 (수입 − 지출)</div>
                      </div>
                      <div ref={sectionRefs.expenses} className={"mag-stat expense" + (pulseSection === "expenses" ? " pulse" : "")} onClick={() => onOpenFinance("expenses")}>
                        <div className="mag-stat-head"><div className="mag-stat-lbl">📉 월 지출</div><div className="mag-stat-arrow">›</div></div>
                        <div className="mag-stat-val amber">-{fmtKRShort(totalExpenseActual || totalExpense)}</div>
                        <div className="mag-stat-sub">{(fin.expenses || []).length}건 · 고정 + 변동</div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* 🎯 재무 목표 위젯 — 매거진 히어로에 통합되므로 숨김 */}
              {false && (() => {
                const fg = settings?.finGoals || { netWorth: 3000000000, monthlyIncome: 10000000, monthlySavings: 5000000 };
                const curNet = netWorth;
                const curIncome = totalIncome;
                const curSavings = profitActual;
                const pctNet = fg.netWorth > 0 ? Math.min(100, Math.round((curNet / fg.netWorth) * 100)) : 0;
                const pctInc = fg.monthlyIncome > 0 ? Math.min(100, Math.round((curIncome / fg.monthlyIncome) * 100)) : 0;
                const pctSav = fg.monthlySavings > 0 ? Math.min(100, Math.round((curSavings / fg.monthlySavings) * 100)) : 0;
                return (
                  <>
                    <div className="ri2-sec-head">
                      <span className="h">🎯 재무 목표</span>
                      <span className="sub">설정 클릭 → 풀스크린 모달</span>
                      <button className="fingoal-edit-btn" onClick={onOpenFinGoals}>✏ 설정</button>
                    </div>
                    <div className="fingoal-grid">
                      <div className="fingoal-card gold" onClick={onOpenFinGoals}>
                        <div className="ic">💎</div>
                        <div className="name">순자산</div>
                        <div className="val">{fmtKR(curNet)}</div>
                        <div className="target">/ {fmtKR(fg.netWorth)}</div>
                        <div className="bar gold"><div style={{ width: pctNet + "%" }} /></div>
                        <div className="pct-row"><span>목표까지 {fmtKR(Math.max(0, fg.netWorth - curNet))}</span><span className="achieved">{pctNet}%</span></div>
                      </div>
                      <div className="fingoal-card green" onClick={onOpenFinGoals}>
                        <div className="ic">📈</div>
                        <div className="name">월 수입</div>
                        <div className="val">{fmtKR(curIncome)}</div>
                        <div className="target">/ {fmtKR(fg.monthlyIncome)}</div>
                        <div className="bar green"><div style={{ width: pctInc + "%" }} /></div>
                        <div className="pct-row"><span>남은 {fmtKR(Math.max(0, fg.monthlyIncome - curIncome))}/월</span><span className="achieved">{pctInc}%</span></div>
                      </div>
                      <div className="fingoal-card blue" onClick={onOpenFinGoals}>
                        <div className="ic">🪙</div>
                        <div className="name">월 저축</div>
                        <div className="val">{fmtKR(curSavings)}</div>
                        <div className="target">/ {fmtKR(fg.monthlySavings)}</div>
                        <div className="bar blue"><div style={{ width: pctSav + "%" }} /></div>
                        <div className="pct-row"><span>남은 {fmtKR(Math.max(0, fg.monthlySavings - curSavings))}/월</span><span className="achieved">{pctSav}%</span></div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* 🏦 자산 & 💼 수익 (4열) — 매거진 카드에서 상세 모달로 진입하므로 숨김 */}
              <div className="ri2-sec-head" style={{ display: "none" }}><span className="h">🏦 자산 & 💼 수익</span><span className="sub">클릭으로 상세 모달</span></div>
              <div className="ri2-detail-grid" style={{ display: "none" }}>
                {/* 자산 */}
                <div ref={sectionRefs.assets} className={"ri2-detail" + (pulseSection === "assets" ? " pulse" : "")} style={{ order: 1 }}>
                  <div className="dc-head">
                    <div className="dc-title">🏦 자산 상세</div>
                    <div className="dc-sum green">{fmtKR(totalAssets)}</div>
                  </div>
                  {Object.entries(ASSET_CATS).map(([cat, label]) => {
                    const list = (fin.assets || []).filter(a => a.category === cat);
                    if (list.length === 0) return null;
                    return (
                      <React.Fragment key={cat}>
                        <div className="ri2-cat-title">{label} <span className="ct-sum">{fmtKR(sumAssets(fin, cat))}</span></div>
                        {list.map(a => (
                          <div key={a.id} className="ri2-item-row"><span className="nm">{a.name}</span><span className="val">{fmtKR(a.value)}</span></div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {(fin.assets || []).length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "8px 0", fontStyle: "italic", textAlign: "center" }}>자산 없음</div>}
                  <button className="ri2-add-btn" onClick={() => onOpenFinance("assets")}>+ 자산 추가 / 수정</button>
                </div>

                {/* 주수익 + 부수익 (그리드 order 3 — 부채 다음) */}
                <div className={"ri2-detail" + (pulseSection === "main-income" || pulseSection === "side-income" ? " pulse" : "")} style={{ order: 3 }}>
                  <div ref={sectionRefs["main-income"]}></div>
                  <div className="dc-head">
                    <div className="dc-title">💼 주수익 <span className="kc-link">DB ←</span></div>
                    <div className="dc-sum green">+{Math.round(mainIncomeSum/10000).toLocaleString()}만/월</div>
                  </div>
                  {mainIncomes.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "4px 0", fontStyle: "italic" }}>주수익 없음</div>}
                  {mainIncomes.map(i => (
                    <div key={i.id} className="ri2-item-row"><span className="nm">{i.name}</span><span className="val green">+{Math.round((i.expected||0)/10000).toLocaleString()}만</span></div>
                  ))}

                  <div ref={sectionRefs["side-income"]} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--border-strong)" }}>
                    <div className="dc-head">
                      <div className="dc-title">🎬 부수익 <span className="kc-link">DB ←</span></div>
                      <div className="dc-sum green">+{Math.round(sideIncomeSum/10000).toLocaleString()}만/월</div>
                    </div>
                    {sideIncomes.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "4px 0", fontStyle: "italic" }}>부수익 없음</div>}
                    {sideIncomes.map(i => (
                      <div key={i.id} className="ri2-item-row"><span className="nm">{i.name}</span><span className="val green">+{Math.round((i.expected||0)/10000).toLocaleString()}만</span></div>
                    ))}
                  </div>
                  <button className="ri2-add-btn" onClick={() => onOpenFinance("incomes")}>+ 수익 추가 / 수정</button>
                </div>

                {/* 부채 (그리드 order 2 — 자산 다음) */}
                <div ref={sectionRefs.debts} className={"ri2-detail" + (pulseSection === "debts" ? " pulse" : "")} style={{ order: 2 }}>
                  <div className="dc-head">
                    <div className="dc-title">🚨 부채 상세</div>
                    <div className="dc-sum red">{totalDebts > 0 ? "-" + fmtKR(totalDebts) : "없음"}</div>
                  </div>
                  {Object.entries(DEBT_CATS).map(([cat, label]) => {
                    const list = (fin.debts || []).filter(d => d.category === cat);
                    if (list.length === 0) return null;
                    return (
                      <React.Fragment key={cat}>
                        <div className="ri2-cat-title">{label} <span className="ct-sum">-{fmtKR(sumDebts(fin, cat))}</span></div>
                        {list.map(d => (
                          <div key={d.id} className="ri2-item-row"><span className="nm">{d.name}</span><span className="val red">-{fmtKR(d.value)}</span></div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {(fin.debts || []).length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "8px 0", fontStyle: "italic", textAlign: "center" }}>부채 없음</div>}
                  <button className="ri2-add-btn" onClick={() => onOpenFinance("debts")}>+ 부채 추가 / 수정</button>
                </div>

                {/* 지출 */}
                <div ref={sectionRefs.expenses} className={"ri2-detail" + (pulseSection === "expenses" ? " pulse" : "")} style={{ order: 4 }}>
                  <div className="dc-head">
                    <div className="dc-title">📉 지출 상세</div>
                    <div className="dc-sum red">-{Math.round(totalExpense/10000).toLocaleString()}만/월</div>
                  </div>
                  {Object.entries(EXPENSE_CATS).map(([cat, label]) => {
                    const list = (fin.expenses || []).filter(e => e.category === cat);
                    if (list.length === 0) return null;
                    const sub = list.reduce((s, e) => s + (e.expected || 0), 0);
                    return (
                      <React.Fragment key={cat}>
                        <div className="ri2-cat-title">{label} <span className="ct-sum">-{Math.round(sub/10000).toLocaleString()}만</span></div>
                        {list.map(e => (
                          <div key={e.id} className="ri2-item-row"><span className="nm">{e.name}</span><span className="val red">-{Math.round((e.expected||0)/10000).toLocaleString()}만</span></div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {(fin.expenses || []).length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "8px 0", fontStyle: "italic", textAlign: "center" }}>지출 없음</div>}
                  <button className="ri2-add-btn" onClick={() => onOpenFinance("expenses")}>+ 지출 추가 / 수정</button>
                </div>
              </div>

              {/* 🎒 인벤토리 (전체 폭) */}
              <div className="ri2-sec-head"><span className="h">🎒 인벤토리</span><span className="sub">아이템 장착 → 자원·스탯 반영</span></div>
              <div className="ri2-inv-section">
                <div className="ri2-inv-head">
                  <div className="inv-tabs">
                    {[
                      { id: "all", label: "전체" },
                      { id: "equipped", label: "장착" },
                      { id: "developing", label: "개발중" },
                      { id: "stored", label: "보관" }
                    ].map((t) => (
                      <button key={t.id} className={"inv-tab" + (filter === t.id ? " active" : "")} onClick={() => setFilter(t.id)}>
                        {t.label}<span className="cnt">{counts[t.id]}</span>
                      </button>
                    ))}
                  </div>
                  <button className="gtr-btn-add" onClick={addItem}>+ 아이템 추가</button>
                </div>
                <div className="inv-grid">
                  {slots.map((it, idx) => (
                    <div key={it ? it.id : "empty-" + idx} className={"inv-slot " + (it ? "filled " + it.status : "empty")} onClick={() => it && setSelectedItem(it)}>
                      {it && (
                        <>
                          <span className="inv-slot-emoji">{it.emoji}</span>
                          {it.status === "developing" && (
                            <div className="inv-slot-progress"><div className="inv-slot-progress-fill" style={{ width: (it.devProgress || 0) + "%" }} /></div>
                          )}
                          <div className="inv-slot-tooltip">{it.name}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="inv-legend">
                  <span><span className="inv-legend-dot eq" />장착됨 (자원 반영)</span>
                  <span><span className="inv-legend-dot dev" />개발중</span>
                  <span><span className="inv-legend-dot stored" />보관</span>
                </div>
              </div>

            </main>
          </div>

          {selectedItem && (
            <ItemDetailModal
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onUpdate={(updates) => updateItem(selectedItem.id, updates)}
              onDelete={() => deleteItem(selectedItem.id)}
              goals={goals}
              stats={stats}
            />
          )}
        </div>
      );
    }

    /* ─── Item Detail Modal ─── */
    function ItemDetailModal({ item, onClose, onUpdate, onDelete, goals, stats }) {
      const [local, setLocal] = useState(item);
      const [emojiPicker, setEmojiPicker] = useState(false);

      useEffect(() => { setLocal(item); }, [item]);

      const update = (k, v) => {
        const next = { ...local, [k]: v };
        setLocal(next);
        onUpdate({ [k]: v });
      };

      const addEffect = (kind) => {
        const next = { ...local, [kind]: [...(local[kind] || []), { type: "money", value: 0, unit: "원/월", desc: "" }] };
        setLocal(next);
        onUpdate({ [kind]: next[kind] });
      };
      const updateEffect = (kind, idx, updates) => {
        const arr = [...(local[kind] || [])];
        arr[idx] = { ...arr[idx], ...updates };
        setLocal({ ...local, [kind]: arr });
        onUpdate({ [kind]: arr });
      };
      const deleteEffect = (kind, idx) => {
        const arr = (local[kind] || []).filter((_, i) => i !== idx);
        setLocal({ ...local, [kind]: arr });
        onUpdate({ [kind]: arr });
      };

      const STATUS_OPTS = [
        { id: "equipped", label: "⚔️ 장착" },
        { id: "developing", label: "🔨 개발중" },
        { id: "stored", label: "📦 보관" }
      ];

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="item-modal-head-bar">
              <div className="item-modal-emoji" onClick={() => setEmojiPicker((v) => !v)} style={{ cursor: "pointer" }} title="클릭하여 이모지 변경">
                {local.emoji}
              </div>
              <div className="item-modal-info">
                <input
                  value={local.name}
                  onChange={(e) => update("name", e.target.value)}
                  style={{ background: "transparent", border: "none", color: "var(--text-1)", fontSize: 18, fontWeight: 600, fontFamily: "Geist, sans-serif", padding: 0, outline: "none", width: "100%" }}
                />
                <span className={"item-modal-status " + local.status}>
                  {local.status === "equipped" ? "⚔️ 장착됨" : local.status === "developing" ? "🔨 개발중" : "📦 보관"}
                </span>
              </div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>

            {emojiPicker && (
              <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 4 }}>
                  {ITEM_EMOJIS.map((e) => (
                    <button key={e} onClick={() => { update("emoji", e); setEmojiPicker(false); }} style={{ background: local.emoji === e ? "var(--accent-soft)" : "var(--bg-3)", border: local.emoji === e ? "1px solid var(--accent)" : "1px solid var(--border)", borderRadius: 5, padding: "4px 0", cursor: "pointer", fontSize: 17 }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-body">
              <div className="item-field">
                <label className="item-field-label">설명</label>
                <textarea rows="2" value={local.description || ""} onChange={(e) => update("description", e.target.value)} placeholder="이 아이템이 무엇이고 어떤 역할인지" />
              </div>

              <div className="item-field-row">
                <label>상태</label>
                <select value={local.status} onChange={(e) => update("status", e.target.value)}>
                  {STATUS_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="item-field-row">
                <label>연결 목표</label>
                <select value={local.goalId || ""} onChange={(e) => update("goalId", e.target.value || null)}>
                  <option value="">미연결</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              {local.status === "developing" && (
                <>
                  <div className="item-field-row">
                    <label>진행률 %</label>
                    <input type="number" min="0" max="100" value={local.devProgress || 0} onChange={(e) => update("devProgress", Number(e.target.value) || 0)} />
                  </div>
                  <div className="item-field-row">
                    <label>완료 예정</label>
                    <input type="date" value={local.devTarget || ""} onChange={(e) => update("devTarget", e.target.value)} />
                  </div>
                </>
              )}

              {/* 버프 */}
              <div className="item-effect-section" style={{ marginTop: 16 }}>
                <div className="item-effect-title"><span style={{ color: "var(--green)" }}>●</span>버프 (장착 시 자원 추가)</div>
                {(local.buffs || []).map((b, i) => (
                  <div key={i} className="item-effect-row buff">
                    <select value={b.type} onChange={(e) => updateEffect("buffs", i, { type: e.target.value })}>
                      <option value="money">💰 수입</option>
                      <option value="time">⏰ 시간</option>
                      <option value="energy">⚡ 에너지</option>
                      <option value="stat">📈 스탯XP</option>
                    </select>
                    {b.type === "stat" ? (
                      <select value={b.statId || ""} onChange={(e) => updateEffect("buffs", i, { statId: e.target.value })}>
                        <option value="">스탯 선택</option>
                        {stats.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={b.desc || ""} onChange={(e) => updateEffect("buffs", i, { desc: e.target.value })} placeholder="설명" />
                    )}
                    <input type="number" value={b.value} onChange={(e) => updateEffect("buffs", i, { value: Number(e.target.value) || 0 })} />
                    <input type="text" value={b.unit || ""} onChange={(e) => updateEffect("buffs", i, { unit: e.target.value })} placeholder="단위" />
                    <button className="btn-del" onClick={() => deleteEffect("buffs", i)}>×</button>
                  </div>
                ))}
                <button className="effect-add-btn" onClick={() => addEffect("buffs")}>+ 버프 추가</button>
              </div>

              {/* 디버프 */}
              <div className="item-effect-section">
                <div className="item-effect-title"><span style={{ color: "var(--red)" }}>●</span>디버프 (장착 시 자원 차감)</div>
                {(local.debuffs || []).map((d, i) => (
                  <div key={i} className="item-effect-row debuff">
                    <select value={d.type} onChange={(e) => updateEffect("debuffs", i, { type: e.target.value })}>
                      <option value="money">💸 지출</option>
                      <option value="time">⏰ 시간 소모</option>
                      <option value="energy">⚡ 에너지 소모</option>
                    </select>
                    <input type="text" value={d.desc || ""} onChange={(e) => updateEffect("debuffs", i, { desc: e.target.value })} placeholder="설명" />
                    <input type="number" value={d.value} onChange={(e) => updateEffect("debuffs", i, { value: Number(e.target.value) || 0 })} />
                    <input type="text" value={d.unit || ""} onChange={(e) => updateEffect("debuffs", i, { unit: e.target.value })} placeholder="단위" />
                    <button className="btn-del" onClick={() => deleteEffect("debuffs", i)}>×</button>
                  </div>
                ))}
                <button className="effect-add-btn" onClick={() => addEffect("debuffs")}>+ 디버프 추가</button>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn-cancel" onClick={onDelete} style={{ color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>🗑 삭제</button>
              <button className="btn-save" onClick={onClose}>✓ 완료</button>
            </div>
          </div>
        </div>
      );
    }

    /* ─── Stage 3: 드림 이미지 액션 (업로드 + AI) ─── */
    function DreamImageActions({ dream, updateDream, uid }) {
      const fileRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [promptOpen, setPromptOpen] = useState(false);
      const [aiPrompt, setAiPrompt] = useState("");

      const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          setBusy(true); setError("");
          const dataUrl = await compressImage(file, 1600, 1000, 0.92);
          const dataKB = Math.round(dataUrl.length / 1024);
          console.log("[DreamImg] 파일 압축 완료:", dataKB + "KB");
          // Storage 우선 → 실패 시 base64 폴백
          const storageUrl = await uploadDreamImageToStorage(dataUrl, dream.id, uid);
          updateDream(dream.id, "imgUrl", storageUrl || dataUrl);
          setError(storageUrl ? "✓ Storage 업로드 완료" : "⚠ Storage 미활성 — base64 (" + dataKB + "KB) 폴백. Firestore 1MB 한계 주의");
          setTimeout(() => setError(""), 5000);
        } catch (err) {
          setError("업로드 실패: " + err.message);
        } finally {
          setBusy(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      };

      const runAi = async () => {
        const apiKey = loadLS("dreamboard_settings", {}).geminiKey || "";
        if (!apiKey) {
          setError("⚙️ 설정에서 Gemini API Key 먼저 입력하세요");
          setTimeout(() => setError(""), 3000);
          return;
        }
        const promptText = aiPrompt.trim() || dream.name;
        try {
          setBusy(true); setError("");
          const rawUrl = await geminiGenerateImage(apiKey, promptText);
          // PNG 원본 → JPEG 압축
          const compressed = await compressDataUrl(rawUrl, 1280, 800, 0.88);
          const origKB = Math.round(rawUrl.length / 1024);
          const newKB = Math.round(compressed.length / 1024);
          console.log("[DreamImg] AI 이미지 생성 완료:", origKB + "KB →", newKB + "KB");
          // Storage 우선 → 실패 시 base64 폴백
          const storageUrl = await uploadDreamImageToStorage(compressed, dream.id, uid);
          updateDream(dream.id, "imgUrl", storageUrl || compressed);
          setPromptOpen(false);
          setAiPrompt("");
          setError(storageUrl ? "✓ Storage 업로드 완료" : ("⚠ Storage 미활성 — base64 (" + newKB + "KB) 폴백"));
          setTimeout(() => setError(""), 3000);
        } catch (err) {
          setError(err.message);
          setTimeout(() => setError(""), 5000);
        } finally {
          setBusy(false);
        }
      };

      return (
        <>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <div className="dream-img-actions">
            <button className="dream-img-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? "처리중..." : "📁 파일 업로드"}
            </button>
            <button className="dream-img-btn ai" disabled={busy} onClick={() => { setPromptOpen(v => !v); if (!aiPrompt) setAiPrompt(dream.name); }}>
              ✨ AI 생성 (나노바나나2)
            </button>
          </div>

          {promptOpen && (
            <div style={{ marginTop: 8, padding: 10, background: "var(--bg-2)", border: "1px solid var(--border-accent)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>🎨 이미지 생성 프롬프트 (자유 입력)</div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="예: 강남 한복판 고급 아파트, 일몰, 시네마틱"
                rows="2"
                style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-1)", padding: 8, fontFamily: "Geist, sans-serif", fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setPromptOpen(false); setAiPrompt(""); }} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-3)", fontSize: 11, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontFamily: "Geist, sans-serif" }}>취소</button>
                <button onClick={runAi} disabled={busy} style={{ background: "var(--accent)", border: "none", color: "#fff", fontSize: 11, padding: "5px 14px", borderRadius: 5, cursor: "pointer", fontFamily: "Geist, sans-serif", fontWeight: 600 }}>
                  {busy ? "생성 중..." : "✨ 생성"}
                </button>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 6 }}>비워두면 드림 이름 "{dream.name}" 사용</div>
            </div>
          )}

          {error && (() => {
            const isOk = error.startsWith("✓");
            return <div style={{ fontSize: 12, color: isOk ? "var(--green)" : "var(--red)", marginTop: 6, padding: "6px 10px", background: isOk ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", borderRadius: 4, whiteSpace: "pre-line", lineHeight: 1.5 }}>{error}</div>;
          })()}
        </>
      );
    }

    /* ─── Stage 4-B: 재무 상세 관리 모달 ─── */
    /* ─── Stage 9: 퀘스트 가이드 모달 ─── */
    function QuestGuideModal({ open, onClose }) {
      if (!open) return null;
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">❓ 퀘스트 분류 가이드</div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">

              <div className="guide-quest-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="guide-quest-card main">
                  <span className="ic">🎯</span>
                  <div className="nm">메인 단계</div>
                  <div className="desc">목표 달성의 <strong style={{color:"var(--accent)"}}>필수</strong> 경로<br/>순서 강제 (1→2→3)<br/>각 +150 XP · 전체 +600 보너스</div>
                </div>
                <div className="guide-quest-card side">
                  <span className="ic">💎</span>
                  <div className="nm">퀘스트</div>
                  <div className="desc"><strong style={{color:"var(--blue)"}}>자유</strong> 진행 · 순서 무관<br/>카운터 (N/M) + 진행바<br/>반복(🔁) · 카운트마다 XP</div>
                </div>
              </div>

              <div className="guide-section">
                <div className="guide-section-title">📊 비교표</div>
                <table className="guide-rule-table">
                  <thead>
                    <tr><th>속성</th><th className="tag-cell">🎯 메인</th><th className="tag-cell">💎 퀘스트</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>필수 여부</td><td className="tag-cell">필수</td><td className="tag-cell">선택</td></tr>
                    <tr><td>순서 강제</td><td className="tag-cell">⭕ Yes</td><td className="tag-cell">❌ No</td></tr>
                    <tr><td>카운터</td><td className="tag-cell">없음 (done/not)</td><td className="tag-cell">N/M 진행도</td></tr>
                    <tr><td>XP 부여</td><td className="tag-cell">+150 (완료)</td><td className="tag-cell">매 카운트 + 완료 보너스</td></tr>
                    <tr><td>진행률 반영</td><td className="tag-cell">⭕ Yes</td><td className="tag-cell">❌ No</td></tr>
                    <tr><td>반복 가능</td><td className="tag-cell">❌</td><td className="tag-cell">🔁 주간/월간</td></tr>
                    <tr><td>완료 보너스</td><td className="tag-cell">+600 (전체)</td><td className="tag-cell">개별 (가변)</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="guide-section">
                <div className="guide-section-title">💡 퀘스트 활용 예시</div>
                <table className="guide-rule-table">
                  <thead><tr><th>예시</th><th>target</th><th>repeat</th></tr></thead>
                  <tbody>
                    <tr><td>역사 롱폼 10개 업로드</td><td>10개</td><td>없음 (1회 누적)</td></tr>
                    <tr><td>매주 영상 2편 업로드</td><td>2편</td><td>🔁 weekly (자동 리셋·미달 시 XP 차감)</td></tr>
                    <tr><td>첫 협업 영상</td><td>1회</td><td>없음 (단순 done)</td></tr>
                    <tr><td>구독자 1,000명</td><td>1000명</td><td>없음 (수동 카운트)</td></tr>
                    <tr><td>월간 임장 1회</td><td>1회</td><td>🔁 monthly</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="guide-decision-box">
                <strong>📌 할일과 연결:</strong> 할일 추가 시 "연결 퀘스트" 선택 → 그 할일 완료할 때마다 자동으로 카운트 +1, XP도 같이 받음.<br/>
                <strong>📌 수동 카운트:</strong> 할일 없이도 퀘스트 카드의 [+] [−] 버튼으로 직접 카운트 조절 가능.<br/>
                <strong>📌 주간 반복:</strong> 매주 월요일 새 주차 진입 시 자동 리셋. 미완료면 XP 50% 차감 (페널티).
              </div>

            </div>
          </div>
        </div>
      );
    }

    /* ─── 재무 목표 풀스크린 모달 ─── */
    function FinancialGoalsModal({ open, onClose, settings, setSettings, currentValues }) {
      const defaults = { netWorth: 3000000000, monthlyIncome: 10000000, monthlySavings: 5000000, milestones: [] };
      const fg = { ...defaults, ...(settings?.finGoals || {}) };
      const [draft, setDraft] = useState(fg);
      useEffect(() => { if (open) setDraft({ ...defaults, ...(settings?.finGoals || {}) }); }, [open]);
      if (!open) return null;

      const update = (k, v) => setDraft(p => ({ ...p, [k]: v }));
      const save = () => {
        setSettings(p => ({ ...p, finGoals: draft }));
        onClose();
      };

      const cur = currentValues || { netWorth: 0, monthlyIncome: 0, monthlySavings: 0 };
      const pctNet = draft.netWorth > 0 ? Math.min(100, Math.round((cur.netWorth / draft.netWorth) * 100)) : 0;
      const pctInc = draft.monthlyIncome > 0 ? Math.min(100, Math.round((cur.monthlyIncome / draft.monthlyIncome) * 100)) : 0;
      const pctSav = draft.monthlySavings > 0 ? Math.min(100, Math.round((cur.monthlySavings / draft.monthlySavings) * 100)) : 0;

      const milestones = Array.isArray(draft.milestones) ? draft.milestones : [];
      const addMilestone = () => {
        const amount = prompt("마일스톤 금액 (원):", "1000000000");
        if (!amount) return;
        const label = prompt("마일스톤 이름:", "10억 (자산가)");
        if (!label) return;
        update("milestones", [...milestones, { id: "ms" + Date.now(), amount: Number(amount) || 0, label, achievedDate: cur.netWorth >= Number(amount) ? new Date().toISOString().slice(0,7) : "" }]);
      };
      const deleteMilestone = (id) => update("milestones", milestones.filter(m => m.id !== id));

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="fgm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fgm-head">
              <div>
                <div className="fgm-title">🎯 재무 목표 설정</div>
                <div className="fgm-sub">순자산 · 월수입 · 월저축 + 마일스톤</div>
              </div>
              <button className="fgm-close" onClick={onClose}>✕</button>
            </div>

            <div className="fgm-body">
              <div className="fgm-left">
                <div className="fgm-goal-card main">
                  <div className="fgm-goal-head">
                    <span className="ic">💎</span>
                    <span className="lbl">순자산 (메인)</span>
                    <span className="cur">현재 {fmtKR(cur.netWorth)}</span>
                  </div>
                  <div className="fgm-input-row">
                    <div className="fgm-input-block">
                      <label>목표 금액 (원)</label>
                      <input type="text" inputMode="numeric" value={fmtComma(draft.netWorth)} onChange={(e) => update("netWorth", parseComma(e.target.value))} />
                    </div>
                  </div>
                  <div className="fgm-progress">
                    <div className="fgm-bar gold"><div style={{ width: pctNet + "%" }} /></div>
                    <div className="fgm-progress-foot">
                      <span className="pct gold">{pctNet}% · {fmtKR(cur.netWorth)}</span>
                      <span className="remain">남은 {fmtKR(Math.max(0, draft.netWorth - cur.netWorth))}</span>
                    </div>
                  </div>
                </div>

                <div className="fgm-goal-card">
                  <div className="fgm-goal-head">
                    <span className="ic">📈</span>
                    <span className="lbl">월 수입</span>
                    <span className="cur">현재 {fmtKR(cur.monthlyIncome)}/월</span>
                  </div>
                  <div className="fgm-input-row">
                    <div className="fgm-input-block">
                      <label>목표 금액 (원/월)</label>
                      <input type="text" inputMode="numeric" value={fmtComma(draft.monthlyIncome)} onChange={(e) => update("monthlyIncome", parseComma(e.target.value))} />
                    </div>
                  </div>
                  <div className="fgm-progress">
                    <div className="fgm-bar green"><div style={{ width: pctInc + "%" }} /></div>
                    <div className="fgm-progress-foot">
                      <span className="pct green">{pctInc}%</span>
                      <span className="remain">남은 {fmtKR(Math.max(0, draft.monthlyIncome - cur.monthlyIncome))}/월</span>
                    </div>
                  </div>
                </div>

                <div className="fgm-goal-card">
                  <div className="fgm-goal-head">
                    <span className="ic">🪙</span>
                    <span className="lbl">월 저축</span>
                    <span className="cur">현재 {fmtKR(cur.monthlySavings)}/월</span>
                  </div>
                  <div className="fgm-input-row">
                    <div className="fgm-input-block">
                      <label>목표 금액 (원/월)</label>
                      <input type="text" inputMode="numeric" value={fmtComma(draft.monthlySavings)} onChange={(e) => update("monthlySavings", parseComma(e.target.value))} />
                    </div>
                  </div>
                  <div className="fgm-progress">
                    <div className="fgm-bar blue"><div style={{ width: pctSav + "%" }} /></div>
                    <div className="fgm-progress-foot">
                      <span className="pct blue">{pctSav}%</span>
                      <span className="remain">남은 {fmtKR(Math.max(0, draft.monthlySavings - cur.monthlySavings))}/월</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fgm-right">
                <div className="fgm-pie-card">
                  <div className="fgm-section-title">📊 순자산 진행률</div>
                  <div className="fgm-pie">
                    <svg viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--bg-3)" strokeWidth="22"/>
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#fbbf24" strokeWidth="22" strokeDasharray="503" strokeDashoffset={503 - (pctNet / 100) * 503} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.5))" }}/>
                    </svg>
                    <div className="fgm-pie-center">
                      <div className="fgm-pie-pct">{pctNet}%</div>
                      <div className="fgm-pie-lbl">{fmtKR(cur.netWorth)} / {fmtKR(draft.netWorth)}</div>
                    </div>
                  </div>
                </div>

                <div className="fgm-milestones">
                  <div className="fgm-section-title">🎖️ 마일스톤 <button className="fgm-add" onClick={addMilestone}>+ 추가</button></div>
                  {milestones.length === 0 && <div className="fgm-empty">마일스톤 없음 — 추가해보세요 (예: 5억/10억/20억)</div>}
                  {[...milestones].sort((a, b) => a.amount - b.amount).map(m => {
                    const achieved = cur.netWorth >= m.amount;
                    const current = !achieved && cur.netWorth >= (m.amount * 0.8);
                    return (
                      <div key={m.id} className="fgm-milestone">
                        <span className={"dot" + (achieved ? " done" : current ? " current" : "")}></span>
                        <span className={"nm" + (achieved ? " done" : "")}>{m.label}</span>
                        <span className="val">{fmtKR(m.amount)}</span>
                        <button className="del" onClick={() => deleteMilestone(m.id)}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="fgm-foot">
              <button className="fgm-btn-cancel" onClick={onClose}>취소</button>
              <button className="fgm-btn-save" onClick={save}>✓ 목표 저장</button>
            </div>
          </div>
        </div>
      );
    }

    function BusinessFlowSection({ finance, setFinance, settings, setSettings }) {
      const sections = (settings.incomeSections && settings.incomeSections.length >= 2)
        ? settings.incomeSections.slice(0, 2)
        : INITIAL_SETTINGS.incomeSections;

      const [editing, setEditing] = useState(null); // section id being edited
      const [editDraft, setEditDraft] = useState({ name: "", icon: "", color: "" });
      const [inline, setInline] = useState({ name: "", type: "in", segment: "primary", amount: 0 });
      const nameInputRef = useRef(null);

      // 통합 항목 목록
      const allItems = [
        ...(finance.incomes  || []).map(i => ({ ...i, _kind: "incomes",  _type: "in"  })),
        ...(finance.expenses || []).map(e => ({ ...e, _kind: "expenses", _type: "out" }))
      ];
      const segOf = (x) => x.segment || "primary";

      const segStats = (segId) => {
        const arr = allItems.filter(x => segOf(x) === segId);
        const income  = arr.filter(x => x._type === "in" ).reduce((s, x) => s + (Number(x.actual) || 0), 0);
        const expense = arr.filter(x => x._type === "out").reduce((s, x) => s + (Number(x.actual) || 0), 0);
        return { income, expense, net: income - expense, count: arr.length };
      };
      const s0 = segStats(sections[0].id);
      const s1 = segStats(sections[1].id);
      const totalIncome = s0.income + s1.income;
      const totalNet    = s0.net + s1.net;
      const pct0 = totalIncome > 0 ? Math.round((s0.income / totalIncome) * 100) : (s0.income > 0 ? 100 : 0);
      const pct1 = totalIncome > 0 ? 100 - pct0 : 0;

      const updateItem = (kind, id, updates) => {
        setFinance(prev => ({ ...prev, [kind]: (prev[kind] || []).map(x => x.id === id ? { ...x, ...updates } : x) }));
      };
      const deleteItem = (kind, id) => {
        setFinance(prev => ({ ...prev, [kind]: (prev[kind] || []).filter(x => x.id !== id) }));
      };
      const toggleSegment = (item) => {
        const nextSeg = segOf(item) === sections[0].id ? sections[1].id : sections[0].id;
        updateItem(item._kind, item.id, { segment: nextSeg });
      };
      const swapKind = (item) => {
        // 수입 ↔ 지출 전환 (배열 이동)
        const fromKind = item._kind;
        const toKind   = fromKind === "incomes" ? "expenses" : "incomes";
        const newId    = (toKind === "incomes" ? "in" : "ex") + Date.now();
        const newCat   = toKind === "incomes" ? "regular" : "fixed";
        const moved    = { id: newId, category: newCat, name: item.name, actual: item.actual || 0, expected: item.expected || item.actual || 0, day: item.day || 1, segment: segOf(item), note: item.note || "" };
        setFinance(prev => ({
          ...prev,
          [fromKind]: (prev[fromKind] || []).filter(x => x.id !== item.id),
          [toKind]:   [...(prev[toKind] || []), moved]
        }));
      };

      const addItemButton = () => {
        // 신규 항목을 인라인 입력 영역에 포커스 — 사용자가 이름부터 채우도록 유도
        if (nameInputRef.current) nameInputRef.current.focus();
      };

      const submitInline = () => {
        const name = inline.name.trim();
        if (!name) return;
        const kind = inline.type === "in" ? "incomes" : "expenses";
        const id   = (inline.type === "in" ? "in" : "ex") + Date.now();
        const amt  = Number(inline.amount) || 0;
        const newRow = {
          id, name,
          category: inline.type === "in" ? "regular" : "fixed",
          actual: amt, expected: amt, day: 1,
          segment: inline.segment
        };
        setFinance(prev => ({ ...prev, [kind]: [...(prev[kind] || []), newRow] }));
        setInline({ name: "", type: inline.type, segment: inline.segment, amount: 0 });
        setTimeout(() => { if (nameInputRef.current) nameInputRef.current.focus(); }, 0);
      };

      const beginEdit = (sec) => {
        setEditing(sec.id);
        setEditDraft({ name: sec.name, icon: sec.icon, color: sec.color });
      };
      const saveEdit = () => {
        if (!editing) return;
        setSettings(prev => ({
          ...prev,
          incomeSections: sections.map(s => s.id === editing ? { ...s, name: editDraft.name.trim() || s.name, icon: editDraft.icon || s.icon, color: editDraft.color || s.color } : s)
        }));
        setEditing(null);
      };

      // 도넛 (반지름 38, 둘레 ~238.76)
      const C = 2 * Math.PI * 38;
      const arc0 = (pct0 / 100) * C;
      const arc1 = (pct1 / 100) * C;

      const fmtAmtMan = (n) => {
        const v = Math.round((Number(n) || 0) / 10000);
        return (v >= 0 ? "+" : "") + v.toLocaleString() + "만";
      };
      const fmtAmtManAbs = (n) => Math.round(Math.abs(Number(n) || 0) / 10000).toLocaleString() + "만";

      const segPillClass = (segId) => "biz-seg-pill" + (segId === sections[0].id ? " s0" : " s1");
      const segCss = (segId) => ({
        "--seg-color": segId === sections[0].id ? sections[0].color : sections[1].color
      });

      return (
        <div className="biz-flow">
          <div className="biz-flow-row">
            {/* ============ 좌: 통합 입력 ============ */}
            <div className="biz-input-panel">
              <div className="biz-input-head">
                <div className="biz-input-title">
                  ✏ 통합 입력
                  <span className="biz-input-sub">한 곳에서 모두 관리</span>
                </div>
                <button className="biz-add-btn" onClick={addItemButton}>+ 항목 추가</button>
              </div>

              <table className="biz-input-table">
                <thead>
                  <tr>
                    <th style={{ width: "32%" }}>이름</th>
                    <th style={{ width: "16%" }}>구분</th>
                    <th style={{ width: "14%" }}>유형</th>
                    <th style={{ width: "12%" }}>분류</th>
                    <th style={{ width: "20%", textAlign: "right" }}>금액</th>
                    <th style={{ width: "6%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.length === 0 && (
                    <tr><td colSpan="6" style={{ color: "var(--text-4)", fontStyle: "italic", padding: "16px 6px", textAlign: "center" }}>아래 행에서 직접 입력하거나 [+ 항목 추가]를 눌러주세요</td></tr>
                  )}
                  {allItems.map(x => (
                    <tr key={x._kind + "-" + x.id}>
                      <td>
                        <input value={x.name} onChange={(e) => updateItem(x._kind, x.id, { name: e.target.value })}
                          className="biz-cell-input" />
                      </td>
                      <td>
                        <span className={segPillClass(segOf(x))} style={segCss(segOf(x))}
                              onClick={() => toggleSegment(x)} title="클릭하여 전환">
                          {(sections.find(s => s.id === segOf(x)) || sections[0]).name}
                        </span>
                      </td>
                      <td>
                        <span className={"biz-type-pill " + (x._type === "in" ? "in" : "out")}
                              onClick={() => swapKind(x)} title="클릭하여 수입↔지출 전환">
                          {x._type === "in" ? "수입" : "지출"}
                        </span>
                      </td>
                      <td>
                        <select value={x.category || (x._type === "in" ? "regular" : "fixed")}
                                onChange={(e) => updateItem(x._kind, x.id, { category: e.target.value })}
                                className="biz-cell-select">
                          {x._type === "in"
                            ? Object.entries(INCOME_CATS).map(([c, l]) => <option key={c} value={c}>{l}</option>)
                            : Object.entries(EXPENSE_CATS).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <input type="text" inputMode="numeric"
                          value={fmtComma(x.actual)}
                          onChange={(e) => updateItem(x._kind, x.id, { actual: parseComma(e.target.value), expected: parseComma(e.target.value) })}
                          className={"biz-cell-num " + (x._type === "in" ? "in" : "out")} />
                      </td>
                      <td>
                        <button onClick={() => deleteItem(x._kind, x.id)} className="biz-row-del">×</button>
                      </td>
                    </tr>
                  ))}

                  {/* 인라인 추가 행 */}
                  <tr className="biz-inline-row">
                    <td>
                      <input ref={nameInputRef} value={inline.name}
                        onChange={(e) => setInline(s => ({ ...s, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitInline(); }}
                        placeholder="+ 직접 입력 후 Enter"
                        className="biz-cell-input biz-inline-name" />
                    </td>
                    <td>
                      <span className={segPillClass(inline.segment)} style={segCss(inline.segment)}
                            onClick={() => setInline(s => ({ ...s, segment: s.segment === sections[0].id ? sections[1].id : sections[0].id }))}>
                        {(sections.find(s => s.id === inline.segment) || sections[0]).name}
                      </span>
                    </td>
                    <td>
                      <span className={"biz-type-pill " + (inline.type === "in" ? "in" : "out")}
                            onClick={() => setInline(s => ({ ...s, type: s.type === "in" ? "out" : "in" }))}>
                        {inline.type === "in" ? "수입" : "지출"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-4)", fontSize: 12 }}>{inline.type === "in" ? "정기" : "고정"}</td>
                    <td style={{ textAlign: "right" }}>
                      <input type="text" inputMode="numeric"
                        value={inline.amount ? fmtComma(inline.amount) : ""}
                        onChange={(e) => setInline(s => ({ ...s, amount: parseComma(e.target.value) }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitInline(); }}
                        placeholder="금액"
                        className={"biz-cell-num " + (inline.type === "in" ? "in" : "out")} />
                    </td>
                    <td>
                      <button onClick={submitInline} className="biz-inline-submit" title="추가 (Enter)">+</button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" style={{ paddingTop: 14, fontWeight: 800, color: "var(--text-2)" }}>월 전체 Net</td>
                    <td style={{ textAlign: "right", fontSize: 16, fontWeight: 800, paddingTop: 14, fontFamily: "Geist Mono, monospace", color: totalNet >= 0 ? "var(--green)" : "var(--red)" }}>
                      {fmtAmtMan(totalNet)}
                    </td>
                    <td style={{ paddingTop: 14 }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ============ 우: 도넛 + 히어로 ============ */}
            <div className="biz-right-stack">
              {/* 도넛 비중 카드 */}
              <div className="biz-share-card">
                <svg viewBox="0 0 100 100" className="biz-share-svg">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#1f1f28" strokeWidth="14"/>
                  <circle cx="50" cy="50" r="38" fill="none" stroke={sections[0].color} strokeWidth="14"
                          strokeDasharray={`${arc0} ${C - arc0}`} strokeDashoffset="0"
                          transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke={sections[1].color} strokeWidth="14"
                          strokeDasharray={`${arc1} ${C - arc1}`} strokeDashoffset={-arc0}
                          transform="rotate(-90 50 50)" />
                  <text x="50" y="46" textAnchor="middle" fill="#9a9aa3" fontSize="8" fontWeight="700" fontFamily="Geist">전체 Net</text>
                  <text x="50" y="60" textAnchor="middle" fill={totalNet >= 0 ? "#10b981" : "#ef4444"} fontSize="12" fontWeight="800" fontFamily="Geist Mono">{fmtAmtMan(totalNet)}</text>
                </svg>
                <div className="biz-share-info">
                  <div className="biz-share-title">월간 수입 비중</div>
                  {sections.map((sec, i) => (
                    <div key={sec.id} className="biz-share-row">
                      <span className="biz-share-sw" style={{ background: sec.color }}></span>
                      <span className="biz-share-name" onDoubleClick={() => beginEdit(sec)} title="더블클릭하여 편집">{sec.icon} {sec.name}</span>
                      <span className="biz-share-pct">{i === 0 ? pct0 : pct1}%</span>
                    </div>
                  ))}
                  <div className="biz-share-total">총 수입 {fmtAmtManAbs(totalIncome)}원 기준</div>
                </div>
              </div>

              {/* 히어로 카드 2개 */}
              {sections.map((sec, i) => {
                const st = i === 0 ? s0 : s1;
                const inMax  = Math.max(st.income, st.expense, 1);
                return (
                  <div key={sec.id} className="biz-hero-card" style={{
                    background: `linear-gradient(135deg, ${sec.color}26 0%, ${sec.color}06 100%)`,
                    borderColor: sec.color + "4D"
                  }}>
                    <div className="biz-hero-head">
                      <div className="biz-hero-name">
                        <span className="biz-hero-dot" style={{ background: sec.color, boxShadow: `0 0 10px ${sec.color}` }}></span>
                        <span className="biz-hero-title" onDoubleClick={() => beginEdit(sec)} title="더블클릭하여 편집">
                          {sec.icon} {sec.name}
                        </span>
                        <span className="biz-hero-pin">{st.count}건</span>
                      </div>
                      <div className="biz-hero-mlbl">월 Net</div>
                    </div>
                    <div className="biz-hero-net" style={{ color: sec.color }}>{fmtAmtMan(st.net)}</div>
                    <div className="biz-hero-bar">
                      {st.income > 0 && <div className="seg-in" style={{ flex: st.income }}>↑ {fmtAmtManAbs(st.income)}</div>}
                      {st.expense > 0 && <div className="seg-out" style={{ flex: st.expense }}>↓ {fmtAmtManAbs(st.expense)}</div>}
                      {st.net > 0 && st.income > st.expense && <div className="seg-save" style={{ flex: Math.max(st.net, inMax * 0.1) }}></div>}
                    </div>
                    <div className="biz-hero-bottom">
                      <span>수입 {fmtAmtManAbs(st.income)}</span>
                      <span>지출 {fmtAmtManAbs(st.expense)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 섹션 편집 팝오버 */}
          {editing && (
            <div className="biz-edit-overlay" onClick={() => setEditing(null)}>
              <div className="biz-edit-pop" onClick={(e) => e.stopPropagation()}>
                <div className="biz-edit-title">섹션 편집</div>
                <div className="biz-edit-lbl">이름</div>
                <input value={editDraft.name} onChange={(e) => setEditDraft(s => ({ ...s, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) saveEdit(); }}
                  autoFocus className="biz-edit-input" />
                <div className="biz-edit-lbl">컬러</div>
                <div className="biz-swatch-row">
                  {SECTION_COLOR_PRESETS.map(c => (
                    <span key={c} className={"biz-swatch" + (editDraft.color === c ? " active" : "")}
                          style={{ background: c }} onClick={() => setEditDraft(s => ({ ...s, color: c }))}></span>
                  ))}
                </div>
                <div className="biz-edit-lbl">아이콘</div>
                <div className="biz-icon-row">
                  {SECTION_ICON_PRESETS.map(ic => (
                    <span key={ic} className={"biz-icon-cell" + (editDraft.icon === ic ? " active" : "")}
                          onClick={() => setEditDraft(s => ({ ...s, icon: ic }))}>{ic}</span>
                  ))}
                </div>
                <div className="biz-edit-actions">
                  <button className="biz-edit-cancel" onClick={() => setEditing(null)}>취소</button>
                  <button className="biz-edit-save" onClick={saveEdit}>저장</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function FinanceDetailModal({ open, onClose, finance, setFinance, items, settings, setSettings, initialSection }) {
      // 2×2 grid layout — 자산/부채/수입/지출 동시 표시, 행별 가로 분할 사용자 조절
      const savedSplit1 = (typeof settings?.financeSplit1 === "number" && settings.financeSplit1 >= 20 && settings.financeSplit1 <= 80) ? settings.financeSplit1 : 50;
      const savedSplit2 = (typeof settings?.financeSplit2 === "number" && settings.financeSplit2 >= 20 && settings.financeSplit2 <= 80) ? settings.financeSplit2 : 50;
      const [split1, setSplit1] = useState(savedSplit1); // 자산:부채
      const [split2, setSplit2] = useState(savedSplit2); // 수입:지출
      const dragRef = useRef(null);
      const containerRef = useRef(null);
      const sectionRefs = {
        assets: useRef(null), debts: useRef(null),
        incomes: useRef(null), expenses: useRef(null)
      };
      const [pulse, setPulse] = useState(null);

      // 3탭 — 요약 / 자산·부채 / 수입·지출
      const initialTab = (sec) => {
        if (sec === "assets" || sec === "debts" || sec === "ad") return "ad";
        if (sec === "incomes" || sec === "expenses" || sec === "ie") return "ie";
        return "summary";
      };
      const [activeTab, setActiveTab] = useState(initialTab(initialSection));

      // 모달 열릴 때마다 initialSection에 맞춰 탭 변경
      useEffect(() => {
        if (open) setActiveTab(initialTab(initialSection));
      }, [open, initialSection]);

      // 펄스 효과 (자산·부채 탭 진입 시)
      useEffect(() => {
        if (!open || !initialSection || activeTab !== "ad") return;
        if (initialSection === "assets" || initialSection === "debts") {
          setPulse(initialSection);
          setTimeout(() => setPulse(null), 2000);
        }
      }, [open, initialSection, activeTab]);

      const startResize = (which) => (e) => {
        e.preventDefault();
        const wrapper = containerRef.current;
        if (!wrapper) return;
        const wrapperRect = wrapper.getBoundingClientRect();
        const startX = e.clientX;
        const startSplit = which === 1 ? split1 : split2;
        const onMove = (ev) => {
          const deltaPct = ((ev.clientX - startX) / wrapperRect.width) * 100;
          let next = Math.max(20, Math.min(80, startSplit + deltaPct));
          if (which === 1) setSplit1(next);
          else setSplit2(next);
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          if (setSettings) {
            setSettings(prev => ({
              ...prev,
              [which === 1 ? "financeSplit1" : "financeSplit2"]: which === 1 ? split1Ref.current : split2Ref.current
            }));
          }
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      };
      const split1Ref = useRef(split1);
      const split2Ref = useRef(split2);
      useEffect(() => { split1Ref.current = split1; }, [split1]);
      useEffect(() => { split2Ref.current = split2; }, [split2]);

      if (!open) return null;

      const updateItem = (kind, id, updates) => {
        setFinance(prev => ({ ...prev, [kind]: (prev[kind] || []).map(x => x.id === id ? { ...x, ...updates } : x) }));
      };
      const addItem = (kind, cat) => {
        const id = (kind === "incomes" ? "in" : kind === "expenses" ? "ex" : kind === "debts" ? "dt" : "a") + Date.now();
        const newItem = (kind === "assets" || kind === "debts")
          ? { id, category: cat, name: "새 항목", value: 0, note: "" }
          : { id, category: cat, name: "새 항목", expected: 0, actual: 0, day: 1 };
        setFinance(prev => ({ ...prev, [kind]: [...(prev[kind] || []), newItem] }));
      };
      const deleteItem = (kind, id) => {
        setFinance(prev => ({ ...prev, [kind]: (prev[kind] || []).filter(x => x.id !== id) }));
      };

      // 자산용 (카테고리별 그룹) — name + value
      const renderValueItems = (kind, cats) => {
        const list = (finance[kind] || []);
        return Object.entries(cats).map(([cat, label]) => {
          const filtered = list.filter(x => x.category === cat);
          const subtotal = filtered.reduce((s, a) => s + (a.value || 0), 0);
          return (
            <div key={cat}>
              <div className="asset-cat-title">{label} <span style={{ float: "right", fontFamily: "Geist Mono, monospace", color: "var(--text-3)", fontSize: 11.5 }}>{fmtKR(subtotal)}</span></div>
              {filtered.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "4px 0", fontStyle: "italic" }}>없음</div>}
              {filtered.map(x => (
                <div key={x.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px 28px", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <input value={x.name} onChange={(e) => updateItem(kind, x.id, { name: e.target.value })}
                    style={{ background: "transparent", border: "none", color: "var(--text-1)", fontSize: 13, fontFamily: "Geist, sans-serif", padding: 0, outline: "none" }} />
                  <input type="text" inputMode="numeric" value={fmtComma(x.value)} onChange={(e) => updateItem(kind, x.id, { value: parseComma(e.target.value) })}
                    placeholder="원 단위"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-1)", fontFamily: "Geist Mono, monospace", padding: "4px 7px", fontSize: 12.5, textAlign: "right", outline: "none" }} />
                  <button onClick={() => deleteItem(kind, x.id)} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", fontSize: 15 }}>×</button>
                </div>
              ))}
              <button onClick={() => addItem(kind, cat)} style={{ width: "100%", background: "var(--bg-2)", border: "1px dashed var(--border-accent)", color: "var(--accent)", padding: "5px 0", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Geist, sans-serif", marginTop: 4 }}>+ {label} 추가</button>
            </div>
          );
        });
      };

      // 부채용 (평면 리스트 + 카테고리 select per row)
      const renderDebtsFlat = () => {
        const list = (finance.debts || []);
        const validCat = (c) => DEBT_CATS[c] ? c : "loan"; // 옛 mortgage 등은 loan으로
        return (
          <>
            {list.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "8px 0", fontStyle: "italic", textAlign: "center" }}>부채 없음</div>}
            {list.map(x => (
              <div key={x.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 28px", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                <input value={x.name} onChange={(e) => updateItem("debts", x.id, { name: e.target.value })}
                  style={{ background: "transparent", border: "none", color: "var(--text-1)", fontSize: 13, fontFamily: "Geist, sans-serif", padding: 0, outline: "none" }} />
                <select value={validCat(x.category)} onChange={(e) => updateItem("debts", x.id, { category: e.target.value })}
                  style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-2)", padding: "4px 6px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  {Object.entries(DEBT_CATS).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                </select>
                <input type="text" inputMode="numeric" value={fmtComma(x.value)} onChange={(e) => updateItem("debts", x.id, { value: parseComma(e.target.value) })}
                  placeholder="원 단위"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--red)", fontFamily: "Geist Mono, monospace", padding: "4px 7px", fontSize: 12.5, textAlign: "right", outline: "none" }} />
                <button onClick={() => deleteItem("debts", x.id)} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", fontSize: 15 }}>×</button>
              </div>
            ))}
            <button onClick={() => addItem("debts", "loan")} style={{ width: "100%", background: "var(--bg-2)", border: "1px dashed var(--border-accent)", color: "var(--accent)", padding: "6px 0", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Geist, sans-serif", marginTop: 6 }}>+ 부채 추가</button>
          </>
        );
      };

      const totalInExp = sumIncome(finance, items);
      const totalInAct = sumIncomeActual(finance);
      const totalExExp = sumExpense(finance, items);
      const totalExAct = sumExpenseActual(finance);
      const profitExp = totalInExp - totalExExp;
      const profitAct = totalInAct - totalExAct;
      const totalAssets = sumAssets(finance);
      const totalDebts = sumDebts(finance);
      const netWorth = totalAssets - totalDebts;

      const renderItems = (kind, cats) => {
        const list = (finance[kind] || []);
        return Object.entries(cats).map(([cat, label]) => {
          const filtered = list.filter(x => x.category === cat);
          return (
            <div key={cat}>
              <div className="asset-cat-title">{label}</div>
              {filtered.length === 0 && <div style={{ fontSize: 12, color: "var(--text-4)", padding: "4px 0", fontStyle: "italic" }}>없음</div>}
              {filtered.map(x => (
                <div key={x.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 28px", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <input value={x.name} onChange={(e) => updateItem(kind, x.id, { name: e.target.value })}
                    style={{ background: "transparent", border: "none", color: "var(--text-1)", fontSize: 13, fontFamily: "Geist, sans-serif", padding: 0, outline: "none" }} />
                  <input type="text" inputMode="numeric" value={fmtComma(x.expected)} onChange={(e) => updateItem(kind, x.id, { expected: parseComma(e.target.value) })}
                    placeholder="예상"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-1)", fontFamily: "Geist Mono, monospace", padding: "4px 7px", fontSize: 12.5, textAlign: "right", outline: "none" }} />
                  <input type="text" inputMode="numeric" value={fmtComma(x.actual)} onChange={(e) => updateItem(kind, x.id, { actual: parseComma(e.target.value) })}
                    placeholder="실제"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-1)", fontFamily: "Geist Mono, monospace", padding: "4px 7px", fontSize: 12.5, textAlign: "right", outline: "none" }} />
                  <button onClick={() => deleteItem(kind, x.id)} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", fontSize: 15 }}>×</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 28px", gap: 8, padding: "4px 0", marginTop: 4 }}>
                <button onClick={() => addItem(kind, cat)} style={{ gridColumn: "1 / -1", background: "var(--bg-2)", border: "1px dashed var(--border-accent)", color: "var(--accent)", padding: "5px 0", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Geist, sans-serif" }}>+ {label} 추가</button>
              </div>
            </div>
          );
        });
      };

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box fin2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">📋 재무 상세 관리</div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>

            {/* 탭 바 */}
            <div className="fsm-tabs-bar">
              <button className={"fsm-tab" + (activeTab === "summary" ? " active" : "")} onClick={() => setActiveTab("summary")}>
                <span className="ic">📊</span> 요약
              </button>
              <button className={"fsm-tab" + (activeTab === "ad" ? " active" : "")} onClick={() => setActiveTab("ad")}>
                <span className="ic">🏦</span> 자산·부채
              </button>
              <button className={"fsm-tab" + (activeTab === "ie" ? " active" : "")} onClick={() => setActiveTab("ie")}>
                <span className="ic">💼</span> 수입·지출
              </button>
            </div>

            <div className="modal-body fin2-body" ref={containerRef}>

              {/* ━━━━ 탭 1: 요약 ━━━━ */}
              {activeTab === "summary" && (
                <div className="fsm-summary">
                  <div className="fsm-summary-grid">
                    <div className="fsm-sum-hero">
                      <div className="lbl">💎 순자산</div>
                      <div className="val">{fmtKRShort(netWorth)}<span style={{ fontSize: 22, color: "var(--text-2)", marginLeft: 4 }}>원</span></div>
                      <div className="sub">자산 {fmtKRShort(totalAssets)} − 부채 {fmtKRShort(totalDebts)}</div>
                      {(() => {
                        const pctAsset = totalAssets > 0 ? Math.min(100, Math.round((totalAssets / (totalAssets + totalDebts || 1)) * 100)) : 0;
                        return (
                          <div className="fsm-sum-bar"><div className="bar-asset" style={{ width: pctAsset + "%" }}></div><div className="bar-debt" style={{ width: (100 - pctAsset) + "%" }}></div></div>
                        );
                      })()}
                    </div>
                    <div className="fsm-sum-side">
                      <div className="fsm-sum-mini">
                        <div className="l">📈 월 수입 (실제)</div>
                        <div className="v green">+{fmtKRShort(totalInAct)}</div>
                      </div>
                      <div className="fsm-sum-mini">
                        <div className="l">📉 월 지출 (실제)</div>
                        <div className="v red">-{fmtKRShort(totalExAct)}</div>
                      </div>
                      <div className="fsm-sum-mini" style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 12 }}>
                        <div className="l">💵 월 Net (저축)</div>
                        <div className={"v " + (profitAct >= 0 ? "green" : "red")}>{fmtKRShortSigned(profitAct)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="fsm-summary-stats">
                    <div className="fsm-sum-stat-card green-bar" onClick={() => setActiveTab("ad")}>
                      <div className="fsm-stat-h"><span>🏦 자산</span><span className="arr">›</span></div>
                      <div className="fsm-stat-v green">{fmtKRShort(totalAssets)}</div>
                      <div className="fsm-stat-s">{(finance.assets || []).length}건</div>
                    </div>
                    <div className="fsm-sum-stat-card red-bar" onClick={() => setActiveTab("ad")}>
                      <div className="fsm-stat-h"><span>🚨 부채</span><span className="arr">›</span></div>
                      <div className="fsm-stat-v red">{totalDebts > 0 ? "-" + fmtKRShort(totalDebts) : "0"}</div>
                      <div className="fsm-stat-s">{(finance.debts || []).length}건</div>
                    </div>
                    <div className="fsm-sum-stat-card blue-bar" onClick={() => setActiveTab("ie")}>
                      <div className="fsm-stat-h"><span>🪙 월 저축</span><span className="arr">›</span></div>
                      <div className={"fsm-stat-v " + (profitAct >= 0 ? "blue" : "red")}>{fmtKRShortSigned(profitAct)}</div>
                      <div className="fsm-stat-s">수입 − 지출</div>
                    </div>
                    <div className="fsm-sum-stat-card amber-bar" onClick={() => setActiveTab("ie")}>
                      <div className="fsm-stat-h"><span>📉 월 지출</span><span className="arr">›</span></div>
                      <div className="fsm-stat-v amber">-{fmtKRShort(totalExAct)}</div>
                      <div className="fsm-stat-s">{(finance.expenses || []).length}건</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ━━━━ 탭 2: 자산·부채 ━━━━ */}
              {activeTab === "ad" && (
                <div className="fin2-row" style={{ gridTemplateColumns: `${split1}% 8px ${100-split1}%` }}>
                  <section ref={sectionRefs.assets} className={"fin2-section" + (pulse === "assets" ? " pulse" : "")}>
                    <div className="fin2-sec-head">
                      <div className="fin2-sec-title">🏦 자산</div>
                      <div className="fin2-sec-sum green">{fmtKR(totalAssets)}</div>
                    </div>
                    <div className="fin2-col-head" style={{ gridTemplateColumns: "1fr 160px 28px" }}>
                      <span>항목</span><span style={{ textAlign: "right" }}>가치 (원)</span><span />
                    </div>
                    {renderValueItems("assets", ASSET_CATS)}
                  </section>
                  <div className="fin2-resize-handle" onMouseDown={startResize(1)} title="드래그로 폭 조절" />
                  <section ref={sectionRefs.debts} className={"fin2-section" + (pulse === "debts" ? " pulse" : "")}>
                    <div className="fin2-sec-head">
                      <div className="fin2-sec-title">🚨 부채</div>
                      <div className="fin2-sec-sum" style={{ color: "var(--red)" }}>{totalDebts > 0 ? "-" + fmtKR(totalDebts) : "0"}</div>
                    </div>
                    <div className="fin2-col-head" style={{ gridTemplateColumns: "1fr 100px 140px 28px" }}>
                      <span>항목</span><span>카테고리</span><span style={{ textAlign: "right" }}>잔액 (원)</span><span />
                    </div>
                    {renderDebtsFlat()}
                  </section>
                </div>
              )}

              {/* ━━━━ 탭 3: 수입·지출 (BusinessFlowSection) ━━━━ */}
              {activeTab === "ie" && (
                <section className="fin2-section biz-flow-section">
                  <div className="fin2-sec-head">
                    <div className="fin2-sec-title">💼 사업별 자금 흐름</div>
                    <div className="fin2-sec-sum" style={{ color: profitAct >= 0 ? "var(--green)" : "var(--red)" }}>
                      Net {profitAct >= 0 ? "+" : ""}{Math.round(profitAct/10000).toLocaleString()}만
                    </div>
                  </div>
                  <BusinessFlowSection finance={finance} setFinance={setFinance} settings={settings} setSettings={setSettings} />
                  {items.filter(i => i.status === "equipped" && (i.debuffs || []).some(d => d.type === "money")).length > 0 && (
                    <div className="biz-debuff-strip">
                      <span className="lbl">⚔️ 장착 아이템 디버프</span>
                      {items.filter(i => i.status === "equipped" && (i.debuffs || []).some(d => d.type === "money")).map(i => (
                        <span key={"d-" + i.id} className="chip">{i.emoji} {i.name} <span style={{ color: "var(--red)" }}>-{(i.debuffs || []).filter(d => d.type === "money").reduce((s,d)=>s+d.value,0).toLocaleString()}</span></span>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="modal-foot">
              <span style={{ fontSize: 12, color: "var(--text-4)" }}>💡 항목 클릭하여 인라인 편집 · 변경 즉시 자동 저장</span>
              <button className="btn-save" onClick={onClose}>✓ 완료</button>
            </div>
          </div>
        </div>
      );
    }

    function App({ user }) {
      const [tab, setTab] = useState("dashboard");
      const [goals, setGoals] = useState(INITIAL_GOALS);
      const [tasks, setTasks] = useState(INITIAL_TASKS);
      const [weeklyGoals, setWeeklyGoals] = useState(INITIAL_WEEKLY_GOALS);
      const [stats, setStats] = useState(INITIAL_STATS);
      const [retros, setRetros] = useState(INITIAL_RETROS);
      const [vision, setVision] = useState(INITIAL_VISION);
      const [dreams, setDreams] = useState(INITIAL_DREAMS);
      const [nextWeekGoals, setNextWeekGoals] = useState(INITIAL_NEXT_WEEKLY_GOALS);
      const [streak, setStreak] = useState(INITIAL_STREAK);
      const [topThree, setTopThree] = useState(INITIAL_TOP_THREE);
      const [dailyLog, setDailyLog] = useState(INITIAL_DAILY_LOG);
      const [focusMode, setFocusMode] = useState(false);
      const [loaded, setLoaded] = useState(false);
      const saveTimer = useRef(null);

      // Stage 1 추가: 자원, 설정, 모달
      const [resources, setResources] = useState(INITIAL_RESOURCES);
      const [items, setItems] = useState(INITIAL_ITEMS);
      const [finance, setFinance] = useState(INITIAL_FINANCE);
      const [summaryCards, setSummaryCards] = useState(INITIAL_SUMMARY_CARDS);
      const [financeModalOpen, setFinanceModalOpen] = useState(false);
      const [financeInitialSection, setFinanceInitialSection] = useState(null);
      const [finGoalsModalOpen, setFinGoalsModalOpen] = useState(false);
      const [settings, setSettings] = useState(() => {
        const loaded = loadLS("dreamboard_settings", INITIAL_SETTINGS);
        // 셧다운된 모델명 자동 마이그레이션
        const next = { ...INITIAL_SETTINGS, ...loaded };
        if (DEAD_MODELS.has(next.geminiImageModel)) next.geminiImageModel = INITIAL_SETTINGS.geminiImageModel;
        if (DEAD_MODELS.has(next.geminiTextModel)) next.geminiTextModel = INITIAL_SETTINGS.geminiTextModel;
        if (!next.geminiImageModel) next.geminiImageModel = INITIAL_SETTINGS.geminiImageModel;
        if (!next.geminiTextModel) next.geminiTextModel = INITIAL_SETTINGS.geminiTextModel;
        return next;
      });
      const [statModalOpen, setStatModalOpen] = useState(false);
      const [guideModalOpen, setGuideModalOpen] = useState(false);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [xpToast, setXpToast] = useState(null);
      useEffect(() => { saveLS("dreamboard_settings", settings); }, [settings]);

      // Firestore에서 데이터 로드
      useEffect(() => {
        _db.collection("users").doc(user.uid).get().then(doc => {
          if (doc.exists) {
            const d = doc.data();
            if (d.goals) setGoals(d.goals.map(migrateGoalQuests));
            if (d.tasks) setTasks(d.tasks);
            if (d.weeklyGoals) setWeeklyGoals(d.weeklyGoals);
            if (d.stats) setStats(d.stats);
            if (d.retros) setRetros(d.retros);
            if (d.vision) setVision(d.vision);
            if (d.dreams) setDreams(d.dreams);
            if (d.nextWeekGoals) setNextWeekGoals(d.nextWeekGoals);
            if (d.streak) setStreak(d.streak);
            if (d.topThree) setTopThree(d.topThree);
            if (d.dailyLog) setDailyLog(d.dailyLog);
            if (d.resources) setResources(d.resources);
            if (d.items) setItems(d.items);
            if (d.finance) setFinance(d.finance);
            if (d.summaryCards) setSummaryCards(d.summaryCards);
          }
          setLoaded(true);
        });
      }, [user.uid]);

      // 저장 상태 (idle | saving | saved | error)
      const [saveStatus, setSaveStatus] = useState("idle");
      const [saveError, setSaveError] = useState("");

      // 변경 시 1.5초 후 Firestore에 저장 (debounce + 에러 처리)
      useEffect(() => {
        if (!loaded) return;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          const payload = { tasks, weeklyGoals, goals, stats, retros, vision, dreams, nextWeekGoals, streak, topThree, dailyLog, resources, items, finance, summaryCards };
          // 페이로드 크기 추정 (대략 JSON 길이 = 바이트)
          const size = JSON.stringify(payload).length;
          const sizeKB = Math.round(size / 1024);
          setSaveStatus("saving");
          _db.collection("users").doc(user.uid).set(payload)
            .then(() => {
              setSaveStatus("saved");
              setSaveError("");
              setTimeout(() => setSaveStatus("idle"), 2000);
            })
            .catch((err) => {
              console.error("Firestore save failed:", err, "payload size:", sizeKB, "KB");
              setSaveStatus("error");
              if (size > 1000000) {
                setSaveError("⚠️ 데이터가 너무 큼 (" + sizeKB + "KB > 1MB). 드림 이미지 일부 삭제 필요.");
              } else if (err.code === "permission-denied") {
                setSaveError("⚠️ Firestore 권한 거부 — 다시 로그인 시도");
              } else {
                setSaveError("⚠️ 저장 실패 (" + sizeKB + "KB): " + (err.message || err.code || "알 수 없음"));
              }
            });
        }, 1500);
      }, [tasks, weeklyGoals, goals, stats, retros, vision, dreams, nextWeekGoals, streak, topThree, dailyLog, resources, items, finance, summaryCards, loaded]);

      // dailyLog 자동 기록
      useEffect(() => {
        if (!loaded) return;
        const today = new Date().toISOString().slice(0, 10);
        const rate = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;
        setDailyLog(prev => ({
          ...prev,
          [today]: { rate, tasksCompleted: tasks.filter(t => t.done).length, total: tasks.length }
        }));
      }, [tasks, loaded]);

      // TOP 3 날짜 초기화
      useEffect(() => {
        if (!loaded) return;
        const today = new Date().toISOString().slice(0, 10);
        if (topThree[0].date !== today) {
          setTopThree(INITIAL_TOP_THREE.map(t => ({ ...t, date: today })));
        }
      }, [loaded]);

      const toggleTask = (id) => {
        setTasks(prev => prev.map(t => {
          if (t.id !== id) return t;
          const willBeDone = !t.done;
          // 완료 전환 → 스탯 XP + 연결 퀘스트 카운트
          if (willBeDone && !t.done) {
            const statId = resolveStatId(t, goals);
            if (statId) {
              const base = xpForTask(t);
              const bonus = streakBonus(streak);
              const xp = Math.round(base * (1 + bonus));
              setStats(ps => ps.map(s => s.id === statId
                ? { ...s, totalXp: getStatTotalXp(s) + xp }
                : s));
              setXpToast({ id: Date.now(), xp, statId });
              setTimeout(() => setXpToast(null), 1800);
            }
            // 연결 퀘스트가 있으면 카운트 +1
            if (t.questId && t.goalId) {
              setTimeout(() => adjustQuestCount(t.goalId, t.questId, +1), 200);
            }
          } else if (!willBeDone && t.done) {
            // 완료 해제 시 퀘스트 카운트도 -1 (방금 카운트 했던 거 되돌리기)
            if (t.questId && t.goalId) {
              setTimeout(() => adjustQuestCount(t.goalId, t.questId, -1), 200);
            }
          }
          return { ...t, done: willBeDone };
        }));
      };
      const toggleWeeklyGoal = (id) => {
        setWeeklyGoals(prev => prev.map(w => w.id === id ? { ...w, done: !w.done } : w));
      };
      const addTask = (task) => setTasks(prev => [...prev, task]);
      const editTask = (id, updates) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
      const editWeeklyGoal = (id, text) => setWeeklyGoals(prev => prev.map(w => w.id === id ? { ...w, text } : w));
      const deleteWeeklyGoal = (id) => setWeeklyGoals(prev => prev.filter(w => w.id !== id));
      const addGoal = (goal) => setGoals(prev => [...prev, goal]);
      const editGoal = (id, updates) => setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
      const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

      // 단계(Stage) 토글 + XP 보상
      const toggleStage = (goalId, stageId) => {
        setGoals(prev => prev.map(g => {
          if (g.id !== goalId) return g;
          const stages = (g.milestones || []).map(m => {
            if (m.id !== stageId) return m;
            const wasDone = m.status === 'done';
            const willBeDone = !wasDone;
            // 완료 전환 → +150 XP
            if (willBeDone && !wasDone) {
              const statId = g.statId || resolveStatId({ goalId, tag: null }, [g]);
              if (statId) {
                setStats(ps => ps.map(s => s.id === statId
                  ? { ...s, totalXp: getStatTotalXp(s) + 150 }
                  : s));
                setXpToast({ id: Date.now(), xp: 150, statId });
                setTimeout(() => setXpToast(null), 1800);
              }
            }
            return { ...m, status: willBeDone ? 'done' : 'active' };
          });
          // 전체 단계 완료 시 +600 XP 보너스
          const allDone = stages.length > 0 && stages.every(s => s.status === 'done');
          const wasAllDone = (g.milestones || []).length > 0 && (g.milestones || []).every(s => s.status === 'done');
          if (allDone && !wasAllDone) {
            const statId = g.statId;
            if (statId) {
              setStats(ps => ps.map(s => s.id === statId
                ? { ...s, totalXp: getStatTotalXp(s) + 600 }
                : s));
              setTimeout(() => {
                setXpToast({ id: Date.now() + 1, xp: 600, statId });
                setTimeout(() => setXpToast(null), 2000);
              }, 600);
            }
          }
          return { ...g, milestones: stages, progress: stages.length > 0 ? Math.round((stages.filter(s => s.status === 'done').length / stages.length) * 100) : g.progress };
        }));
      };

      // 드림 클릭 → 비전 탭으로 이동 + 모달 자동 오픈
      const [dreamToOpen, setDreamToOpen] = useState(null);
      const handleDreamClick = (dreamId) => {
        setDreamToOpen(dreamId);
        setTab("vision");
      };

      // 목표 카드 수정 → 목표·업무 탭 이동
      const [goalToOpen, setGoalToOpen] = useState(null);
      const [resourcesHighlight, setResourcesHighlight] = useState(null);
      const [taskFullscreen, setTaskFullscreen] = useState(false);
      const handleEditGoal = (goalId) => {
        setGoalToOpen(goalId);
        setTab("gtr");
      };

      // 대시보드 목표 클릭 → 세부 모달
      const [goalDetailId, setGoalDetailId] = useState(null);

      // 퀘스트 가이드 모달
      const [questGuideOpen, setQuestGuideOpen] = useState(false);

      // ── 퀘스트 카운트 변경 (수동 +/- or 할일 자동) ──
      // delta: +1 = 카운트 증가, -1 = 카운트 감소
      const adjustQuestCount = (goalId, questId, delta) => {
        setGoals(prev => prev.map(g => {
          if (g.id !== goalId) return g;
          const quests = (g.quests || []).map(q => {
            if (q.id !== questId) return q;
            const newCurrent = Math.max(0, Math.min(q.target, q.current + delta));
            const wasDone = q.done;
            const willBeDone = newCurrent >= q.target;
            const statId = g.statId;
            if (delta > 0 && statId) {
              // 카운트 +1 시 작은 XP
              const stepXp = q.xpPerStep || 0;
              const totalXp = stepXp + (willBeDone && !wasDone ? (q.xpReward || 0) : 0);
              if (totalXp > 0) {
                setStats(ps => ps.map(st => st.id === statId
                  ? { ...st, totalXp: getStatTotalXp(st) + totalXp } : st));
                setXpToast({ id: Date.now(), xp: totalXp, statId });
                setTimeout(() => setXpToast(null), 1800);
              }
            }
            return { ...q, current: newCurrent, done: willBeDone };
          });
          return { ...g, quests };
        }));
      };

      // 매주 반복 퀘스트 자동 리셋 (월요일 새 주차 진입 시)
      useEffect(() => {
        if (!loaded) return;
        const curWeek = getWeekNumber();
        setGoals(prev => prev.map(g => {
          const quests = (g.quests || []).map(q => {
            if (q.repeat !== "weekly") return q;
            if (q.lastResetWeek === curWeek) return q;
            // 미완료 시 XP 차감
            if (!q.done && q.current < q.target && g.statId) {
              const penalty = Math.round((q.xpReward || 30) * 0.5);
              setStats(ps => ps.map(st => st.id === g.statId
                ? { ...st, totalXp: Math.max(0, getStatTotalXp(st) - penalty) } : st));
            }
            return { ...q, current: 0, done: false, lastResetWeek: curWeek };
          });
          return { ...g, quests };
        }));
      }, [loaded]);

      // Keyboard nav 1~4
      useEffect(() => {
        const onKey = (e) => {
          if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
          if (e.key === "1") setTab("dashboard");
          if (e.key === "2") setTab("gtr");
          if (e.key === "3") setTab("resources");
          if (e.key === "4") setTab("vision");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, []);

      if (!loaded) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', color: 'var(--text-3)', fontFamily: 'Geist, sans-serif', fontSize: 15 }}>
          데이터 불러오는 중...
        </div>
      );

      return (
        <div className="app" data-screen-label={
          tab === "dashboard" ? "01 Dashboard" : tab === "goals" ? "02 Goals" : "03 Tasks"
        }>
          {(() => {
            const totalLv = stats.reduce((a, s) => a + statLevel(getStatTotalXp(s)), 0);
            const totalXp = stats.reduce((a, s) => a + getStatTotalXp(s), 0);
            const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
            const streakCount = streak.filter((v, i) => i <= todayIdx && v).length;
            const maxXpAtLv60 = STAT_LEVEL_REQ[9] * 6;
            const computedRes = computeResources(resources, items);
            const profit = computedRes.money.profit;
            const energyLeft = (computedRes.energy.weeklyPool + computedRes.energy.buff) - computedRes.energy.used;
            const timeUsed = computedRes.time.used;
            return (
              <div className="topbar topbar-unified">
                <div className="brand">
                  <div className="brand-mark" />
                  <div className="brand-name">DreamBoard</div>
                </div>
                <Tabs active={tab} onChange={setTab} />
                <div className="topbar-right">
                  <button className="focus-quick-btn" onClick={() => { setSettings(p => ({ ...p, taskTab: "focus" })); setTab("gtr"); setTaskFullscreen(true); }} title="풀스크린 집중모드 진입">🍅 집중</button>
                  <div className="player-bar">
                    <span className="pb-lv">Lv.{totalLv}</span>
                    <div className="pb-bar"><div className="pb-bar-fill" style={{ width: `${Math.min(100, (totalXp / maxXpAtLv60) * 100)}%` }} /></div>
                    <span className="pb-xp">{totalXp.toLocaleString()} XP</span>
                    {streakCount > 0 && <span className="pb-streak">🔥{streakCount}</span>}
                  </div>
                  <div className="header-resources" onClick={() => setTab("resources")} title="자원·아이템 탭으로 이동">
                    <span className={"hr-item " + (profit >= 0 ? "pos" : "neg")}>💰 {profit >= 0 ? "+" : ""}{Math.round(profit/10000)}만</span>
                    <span className="hr-item">⚡ {energyLeft}</span>
                    <span className="hr-item">⏰ {timeUsed.toFixed(0)}h</span>
                  </div>
                  <button className="gear-btn" onClick={() => setSettingsOpen(true)} title="설정">⚙</button>
                </div>
              </div>
            );
          })()}

          {tab === "dashboard" && <Dashboard
            goals={goals} tasks={tasks} toggleTask={toggleTask}
            stats={stats} dreams={dreams}
            streak={streak} dailyLog={dailyLog}
            focusMode={focusMode} setFocusMode={setFocusMode}
            resources={computeResources(resources, items)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenResources={(section) => { setTab("resources"); if (section) setResourcesHighlight(section); }}
            onDreamClick={handleDreamClick}
            toggleStage={toggleStage}
            adjustQuestCount={adjustQuestCount}
            onOpenQuestGuide={() => setQuestGuideOpen(true)}
            onEditGoal={handleEditGoal}
            summaryCards={summaryCards}
            setSummaryCards={setSummaryCards}
            settings={settings}
            onOpenGoalDetail={(gId) => setGoalDetailId(gId)}
            finance={finance}
            items={items}
            onOpenFinGoals={() => setFinGoalsModalOpen(true)}
          />}
          {tab === "gtr" && <GoalsTasksRetroTab
            goals={goals} setGoals={setGoals} addGoal={addGoal} editGoal={editGoal} deleteGoal={deleteGoal}
            toggleStage={toggleStage} adjustQuestCount={adjustQuestCount}
            tasks={tasks} toggleTask={toggleTask} addTask={addTask} editTask={editTask} deleteTask={deleteTask}
            retros={retros} setRetros={setRetros} dailyLog={dailyLog} stats={stats}
            onOpenQuestGuide={() => setQuestGuideOpen(true)}
            initialOpenGoalId={goalToOpen} onGoalOpened={() => setGoalToOpen(null)}
            settings={settings} setSettings={setSettings}
            taskFullscreen={taskFullscreen} setTaskFullscreen={setTaskFullscreen}
          />}
          {tab === "resources" && <ResourcesItemsTab
            items={items} setItems={setItems}
            resources={resources} setResources={setResources}
            goals={goals} stats={stats} settings={settings} setSettings={setSettings}
            finance={finance} setFinance={setFinance}
            onOpenFinance={(section) => { setFinanceInitialSection(section || null); setFinanceModalOpen(true); }}
            onOpenFinGoals={() => setFinGoalsModalOpen(true)}
            onOpenStatModal={() => setStatModalOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            uid={user?.uid}
            highlightSection={resourcesHighlight}
            onHighlightConsumed={() => setResourcesHighlight(null)}
          />}
          {tab === "vision" && <VisionTab vision={vision} setVision={setVision} stats={stats} setStats={setStats} dreams={dreams} setDreams={setDreams} initialOpenDreamId={dreamToOpen} onDreamOpened={() => setDreamToOpen(null)} uid={user?.uid} settings={settings} setSettings={setSettings} />}

          <div className="kbd-hints">
            <span>키보드</span>
            <span><span className="kbd">1</span> 대시보드</span>
            <span><span className="kbd">2</span> 목표·업무</span>
            <span><span className="kbd">3</span> 자원·아이템</span>
            <span><span className="kbd">4</span> 비전·드림</span>
            <span style={{ marginLeft: "auto" }}>할일 완료 시 XP 획득 · 스트릭 보너스 ×1.25</span>
          </div>

          {xpToast && <XpToast event={xpToast} />}

          {/* 저장 상태 인디케이터 (좌측 하단) */}
          {saveStatus !== "idle" && (
            <div style={{
              position: "fixed", bottom: 20, left: 20, zIndex: 9999,
              padding: "10px 14px", borderRadius: 8, fontSize: 12,
              fontFamily: "Geist Mono, monospace",
              background: saveStatus === "error" ? "rgba(239,68,68,0.95)" : saveStatus === "saving" ? "rgba(245,158,11,0.95)" : "rgba(16,185,129,0.95)",
              color: "#fff", fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              maxWidth: 460, lineHeight: 1.5
            }}>
              {saveStatus === "saving" && "💾 저장 중..."}
              {saveStatus === "saved" && "✓ 저장됨"}
              {saveStatus === "error" && (
                <div>
                  <div>{saveError}</div>
                  {/^⚠️ 데이터가 너무 큼/.test(saveError) && (
                    <button onClick={async () => {
                      // 모든 드림 이미지 강제 재압축 (640×400 q0.6 = 더 작게)
                      const newDreams = await Promise.all((dreams || []).map(async d => {
                        if (!d.imgUrl || !d.imgUrl.startsWith("data:")) return d;
                        try {
                          const url = await compressDataUrl(d.imgUrl, 640, 400, 0.6);
                          return { ...d, imgUrl: url };
                        } catch (e) { return d; }
                      }));
                      setDreams(newDreams);
                    }} style={{
                      marginTop: 8, background: "#fff", color: "var(--red)", border: "none",
                      padding: "6px 14px", borderRadius: 5, cursor: "pointer",
                      fontFamily: "Geist, sans-serif", fontSize: 12, fontWeight: 700,
                      width: "100%"
                    }}>
                      🔧 모든 이미지 강제 재압축 (640×400 q0.6)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage 1 모달들 */}
          <StatModal
            open={statModalOpen}
            onClose={() => setStatModalOpen(false)}
            stats={stats}
            setStats={setStats}
            onOpenGuide={() => setGuideModalOpen(true)}
          />
          <LevelGuideModal
            open={guideModalOpen}
            onClose={() => setGuideModalOpen(false)}
            currentMaxLevel={Math.max(...stats.map(s => statLevel(getStatTotalXp(s))))}
          />
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            setSettings={setSettings}
            onLogout={() => _auth.signOut()}
          />
          <FinanceDetailModal
            open={financeModalOpen}
            onClose={() => { setFinanceModalOpen(false); setFinanceInitialSection(null); }}
            finance={finance}
            setFinance={setFinance}
            items={items}
            settings={settings}
            setSettings={setSettings}
            initialSection={financeInitialSection}
          />
          <FinancialGoalsModal
            open={finGoalsModalOpen}
            onClose={() => setFinGoalsModalOpen(false)}
            settings={settings}
            setSettings={setSettings}
            currentValues={{
              netWorth: sumAssets(finance) - sumDebts(finance),
              monthlyIncome: sumIncome(finance, items),
              monthlySavings: sumIncome(finance, items) - sumExpense(finance, items)
            }}
          />
          <QuestGuideModal
            open={questGuideOpen}
            onClose={() => setQuestGuideOpen(false)}
          />
          <GoalDetailModal
            open={!!goalDetailId}
            onClose={() => setGoalDetailId(null)}
            goal={goals.find(g => g.id === goalDetailId)}
            stats={stats}
            tasks={tasks}
            onEditGoal={editGoal}
            onDeleteGoal={deleteGoal}
            toggleStage={toggleStage}
            onEditInGoalsTab={handleEditGoal}
          />
        </div>
      );
    }

    /* ---------- GoalDetailModal ---------- */
    function GoalDetailModal({ open, onClose, goal, stats, tasks, onEditGoal, onDeleteGoal, toggleStage, onEditInGoalsTab }) {
      if (!open || !goal) return null;
      const stages = goal.milestones || [];
      const doneStages = stages.filter(m => m.status === "done").length;
      const totalStages = stages.length;
      const pct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : (goal.progress || 0);
      const activeStage = stages.find(m => m.status === "active") || stages.find(m => m.status !== "done");
      const allStagesDone = totalStages > 0 && doneStages === totalStages;
      const quests = goal.quests || [];
      const dday = calcDday(goal.deadline);
      const ddayCls = dday <= 3 ? "dday-red" : dday <= 7 ? "dday-amber" : "dday-norm";
      const tier = goal.tier || "normal";
      const stat = goal.statId ? stats.find(s => s.id === goal.statId) : null;
      const goalTasks = tasks.filter(t => t.goalId === goal.id);
      const doneTasks = goalTasks.filter(t => t.done).length;
      const taskPct = goalTasks.length > 0 ? Math.round((doneTasks / goalTasks.length) * 100) : 0;

      const totalQuestXp = quests.reduce((sum, q) => {
        if (q.done) return sum + (q.xpReward || 0);
        const step = q.xpPerStep || 0;
        return sum + step * (q.current || 0);
      }, 0);
      const stageXp = stages.filter(m => m.status === "done").reduce((s, m) => s + (m.xpReward || 150), 0);
      const accumulatedXp = stageXp + totalQuestXp + (allStagesDone ? 600 : 0);

      // 큰 반원 게이지 — 340x200, r=134 → πr ≈ 421
      const arcLen = 421;
      const arcOffset = arcLen - (pct / 100) * arcLen;

      const handleDelete = () => {
        if (window.confirm(`"${goal.name}" 목표를 삭제할까요? (복구 불가)`)) {
          onDeleteGoal(goal.id);
          onClose();
        }
      };

      return (
        <div className="gdm-overlay" onClick={onClose}>
          <div className="gdm-card" onClick={(e) => e.stopPropagation()}>
            <div className="gdm-head">
              <button className="gdm-back" onClick={onClose}>← 대시보드</button>
              <div className="gdm-title-block">
                {goal.category && <div className="gdm-cat">{goal.category}</div>}
                <div className="gdm-name">{goal.name}</div>
                <div className="gdm-meta">
                  <span className={"tier " + tier}>{tier.toUpperCase()}</span>
                  {goal.deadline && <>
                    <span className={ddayCls}>{dday >= 0 ? "D-" + dday : "D+" + Math.abs(dday)}</span>
                    <span style={{ color: "var(--text-4)" }}>· {goal.deadline} 마감</span>
                  </>}
                  <span style={{ color: "var(--text-4)" }}>· 누적 XP {accumulatedXp.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="gdm-action primary" onClick={() => { onEditInGoalsTab && onEditInGoalsTab(goal.id); onClose(); }}>✏ 수정</button>
                <button className="gdm-action danger" onClick={handleDelete}>🗑 삭제</button>
              </div>
            </div>

            <div className="gdm-body">
              {/* LEFT: 큰 반원 게이지 + 현재 단계 */}
              <div className="gdm-gauge-area">
                <div className="gdm-gauge-title">📊 전체 진행률</div>
                <div className="gdm-big-gauge">
                  <svg viewBox="0 0 340 200" preserveAspectRatio="xMidYMid meet">
                    <path className="gdm-bg-bg" d="M 36 178 A 134 134 0 0 1 304 178" />
                    <path className="gdm-bg-fg" d="M 36 178 A 134 134 0 0 1 304 178" strokeDasharray={arcLen} strokeDashoffset={arcOffset} />
                  </svg>
                  <div className="gdm-bg-pct">{pct}<span className="u">%</span></div>
                </div>
                <div className="gdm-bg-sub">
                  단계 {doneStages}/{totalStages} 완료
                  {!allStagesDone && totalStages > 0 && " · 다음 단계까지 +150 XP"}
                  {allStagesDone && " · 🎁 전체 보너스 +600 XP 획득"}
                </div>

                <div className="gdm-current-stage-box">
                  <div className="gdm-current-lbl">📌 현재 단계</div>
                  {activeStage ? (
                    <div className={"gdm-current-card" + (allStagesDone ? " done" : "")}>
                      <div className="gdm-current-tag">📍 STAGE {stages.indexOf(activeStage) + 1} · {activeStage.status === "done" ? "완료" : "진행중"}</div>
                      <div className="gdm-current-name">{activeStage.name}</div>
                      <div className="gdm-current-xp">완료 시 +{activeStage.xpReward || 150} XP</div>
                    </div>
                  ) : (
                    <div className="gdm-empty">단계가 없습니다 — 목표·업무 탭에서 추가</div>
                  )}
                </div>
              </div>

              {/* RIGHT: 단계+퀘스트 (2열) + 통계 */}
              <div className="gdm-right-col">
                <div className="gdm-stages-quests">
                  <div className="gdm-stages">
                    <div className="gdm-section-title">🎯 메인 단계 ({doneStages}/{totalStages})</div>
                    {stages.length === 0 && <div className="gdm-empty">단계가 없습니다</div>}
                    {stages.map((m, i) => {
                      const isDone = m.status === "done";
                      const isActive = m === activeStage && !isDone;
                      return (
                        <div key={m.id || i} className="gdm-stage-node">
                          <span className={"gdm-sn-dot " + (isDone ? "done" : isActive ? "active" : "")} onClick={() => toggleStage && toggleStage(goal.id, m.id)} style={{ cursor: toggleStage ? "pointer" : "default" }}>{isDone ? "✓" : ""}</span>
                          <span className={"gdm-sn-name " + (isDone ? "done" : isActive ? "active" : "")}>{m.name}</span>
                          <span className="gdm-sn-xp">+{m.xpReward || 150}{isDone ? " ✓" : ""}</span>
                        </div>
                      );
                    })}
                    {stages.length > 0 && (
                      <div className="gdm-bonus"><span>🎁 전체 달성 보너스</span><span>+600 XP{allStagesDone ? " ✓" : ""}</span></div>
                    )}
                  </div>

                  <div className="gdm-stages">
                    <div className="gdm-section-title">💎 퀘스트 ({quests.filter(q => q.done).length}/{quests.length})</div>
                    {quests.length === 0 && <div className="gdm-empty">퀘스트가 없습니다</div>}
                    {quests.length > 0 && (
                      <div className="gdm-quests">
                        {quests.map(q => {
                          const target = q.target || 1;
                          const cur = q.current || 0;
                          const qPct = q.done ? 100 : Math.min(100, Math.round((cur / target) * 100));
                          const dash = 207;
                          const off = dash - (qPct / 100) * dash;
                          return (
                            <div key={q.id} className="gdm-q-card">
                              <div className="gdm-q-ring">
                                <svg viewBox="0 0 80 80">
                                  <circle className="gdm-q-bg" cx="40" cy="40" r="33" />
                                  <circle className={"gdm-q-fg" + (q.done ? " done" : "")} cx="40" cy="40" r="33" strokeDasharray={dash} strokeDashoffset={q.done ? 0 : off} />
                                </svg>
                                <div className={"gdm-q-pct" + (q.done ? " done" : "")}>{q.done ? "✓" : qPct + "%"}</div>
                              </div>
                              <div className="gdm-q-name">{q.name}{q.repeat === "weekly" ? " 🔁" : ""}</div>
                              <div className={"gdm-q-frac" + (q.done ? " done" : "")}>{q.done ? "완료" : cur + "/" + target + (q.repeat === "weekly" ? " (이번주)" : "")}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="gdm-stats-row">
                  <div className="gdm-stat-card">
                    <div className="gdm-stat-title">📈 누적 XP</div>
                    <div className="gdm-stat-big">{accumulatedXp.toLocaleString()}<span style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 4 }}>XP</span></div>
                    <div className="gdm-stat-sub">단계 {stageXp} + 퀘스트 {totalQuestXp}{allStagesDone ? " + 보너스 600" : ""}</div>
                  </div>
                  <div className="gdm-stat-card">
                    <div className="gdm-stat-title">✓ 완료 할일</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ position: "relative", width: 56, height: 56 }}>
                        <svg viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="30" cy="30" r="25" fill="none" stroke="var(--bg-3)" strokeWidth="6"/>
                          <circle cx="30" cy="30" r="25" fill="none" stroke="url(#ringGrad)" strokeWidth="6" strokeDasharray="157" strokeDashoffset={157 - (taskPct / 100) * 157} strokeLinecap="round"/>
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist Mono, monospace", fontSize: 13, fontWeight: 800 }}>{taskPct}%</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 20, fontWeight: 800 }}>{doneTasks}<span style={{ fontSize: 12, color: "var(--text-3)" }}> / {goalTasks.length}</span></div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>연결된 할일</div>
                      </div>
                    </div>
                  </div>
                  <div className="gdm-stat-card">
                    <div className="gdm-stat-title">⚔️ 연결 스탯</div>
                    {stat ? (() => {
                      const tx = getStatTotalXp(stat);
                      const lv = statLevel(tx);
                      const prog = statLevelProgress(tx);
                      const nextNeed = lv < 10 ? STAT_LEVEL_REQ[lv] - tx : 0;
                      return (
                        <>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontSize: 26 }}>{stat.icon}</span>
                            <div>
                              <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>Lv.{lv}</div>
                              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{stat.label}{lv < 10 ? ` · Lv.${lv + 1}까지 ${nextNeed.toLocaleString()} XP` : " · 만렙"}</div>
                            </div>
                          </div>
                          <div style={{ height: 5, background: "var(--bg-3)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: (prog * 100) + "%", background: "linear-gradient(90deg, var(--accent-2), var(--accent))", boxShadow: "0 0 6px var(--accent-glow)" }} />
                          </div>
                        </>
                      );
                    })() : (
                      <div className="gdm-empty">연결된 스탯 없음</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* ---------- Login / Root ---------- */
    function LoginScreen({ onLogin }) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', fontFamily: 'Geist, sans-serif', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="brand-mark" />
            <span style={{ fontSize: 23, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>DreamBoard</span>
          </div>
          <p style={{ color: 'var(--text-4)', fontSize: 14, margin: 0 }}>개인 목표 대시보드 · 로그인이 필요합니다</p>
          <button onClick={onLogin} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text-1)', fontSize: 15, fontWeight: 500, padding: '12px 24px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google로 로그인
          </button>
        </div>
      );
    }

    function AccessDenied({ onLogout }) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', fontFamily: 'Geist, sans-serif', gap: 16 }}>
          <p style={{ color: 'var(--red)', fontSize: 16, fontWeight: 600, margin: 0 }}>접근 권한이 없습니다</p>
          <p style={{ color: 'var(--text-4)', fontSize: 14, margin: 0 }}>허가된 계정으로만 접근 가능합니다</p>
          <button onClick={onLogout} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontSize: 14, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>다른 계정으로 로그아웃</button>
        </div>
      );
    }

    function Root() {
      const [user, setUser] = useState(undefined);

      useEffect(() => {
        _auth.onAuthStateChanged(u => setUser(u || null));
      }, []);

      const signIn = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        _auth.signInWithPopup(provider);
      };

      if (user === undefined) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', color: 'var(--text-4)', fontFamily: 'Geist, sans-serif', fontSize: 15 }}>
          로딩 중...
        </div>
      );
      if (!user) return <LoginScreen onLogin={signIn} />;
      if (user.email !== ALLOWED_EMAIL) return <AccessDenied onLogout={() => _auth.signOut()} />;
      return <App user={user} />;
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<Root />);

    const { useState, useEffect, useMemo, useRef } = React;

    /* --- helpers --- */
    function calcDday(dateStr) {
      const today = new Date();
      const target = new Date(dateStr);
      return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
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
      { id: "t1", text: "유튜브 영상 #8 편집 마무리", done: false, quadrant: 1, goalId: "g1", time: "10:00", tag: "유튜브" },
      { id: "t2", text: "NoteUp 마케팅 영상 #4 콘티 작성", done: true, quadrant: 2, goalId: "g2", time: "11:30", tag: "NoteUp" },
      { id: "t3", text: "자동화 프로그램 — 큐 처리 로직 리팩터", done: false, quadrant: 2, goalId: "g3", time: "14:00", tag: "개발" },
      { id: "t4", text: "썸네일 A/B 시안 3개 제작", done: false, quadrant: 1, goalId: "g1", time: "16:00", tag: "유튜브" },
      { id: "t5", text: "이번주 회고 메모 정리", done: false, quadrant: 2, goalId: null, time: "21:00", tag: "회고" },
      { id: "t6", text: "주간 뉴스레터 훑기", done: true, quadrant: 4, goalId: null, time: "09:00", tag: "리서치" },
      { id: "t7", text: "팔로워 DM 답장", done: false, quadrant: 3, goalId: "g1", time: "12:30", tag: "유튜브" },
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

    const INITIAL_SETTINGS = {
      geminiKey: "",
      weeklyTimePool: 72,
      weeklyEnergyPool: 100
    };

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

    const INITIAL_DREAMS = [
      { id: "d1", name: "아파트 이사", emoji: "🏠", targetAmount: 150000, currentAmount: 30000, unit: "만원", imgUrl: "",
        calc: { monthlySavings: 500, targetYears: 5 } },
      { id: "d2", name: "제네시스 GV80", emoji: "🚗", targetAmount: 20000, currentAmount: 0, unit: "만원", imgUrl: "",
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

    /* ---------- TAB 1: Dashboard ---------- */
    function Dashboard({ goals, tasks, toggleTask, weeklyGoals, toggleWeeklyGoal, editWeeklyGoal, deleteWeeklyGoal, setWeeklyGoals, stats, dreams, nextWeekGoals, setNextWeekGoals, streak, setStreak, topThree, setTopThree, dailyLog, focusMode, setFocusMode, resources, onOpenStatModal, onOpenResources }) {
      const [editingWeeklyId, setEditingWeeklyId] = useState(null);
      const [editingWeeklyText, setEditingWeeklyText] = useState("");
      const overall = useMemo(() => goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0, [goals]);
      const dayLabels = ['월','화','수','목','금','토','일'];
      const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      const streakCount = streak.filter((v, i) => i <= todayIdx && v).length;
      const toggleStreakDay = (i) => { if (i > todayIdx) return; setStreak(prev => prev.map((v, idx) => idx === i ? !v : v)); };
      const addNextWeek = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { setNextWeekGoals(prev => [...prev, { id: 'nw' + Date.now(), text: e.target.value.trim(), done: false }]); e.target.value = ''; } };

      // 히트맵: 최근 28일
      const heatmapCells = useMemo(() => {
        const cells = [];
        for (let i = 27; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const isToday = i === 0;
          const entry = dailyLog[key];
          const rate = entry ? entry.rate : -1;
          const lv = rate < 0 ? '' : rate < 30 ? 'lv1' : rate < 60 ? 'lv2' : 'lv3';
          cells.push({ key, lv, isToday });
        }
        return cells;
      }, [dailyLog]);

      // 목표별 연결 태스크
      const tasksByGoal = useMemo(() => {
        const map = {};
        goals.forEach(g => { map[g.id] = tasks.filter(t => t.goalId === g.id); });
        return map;
      }, [goals, tasks]);

      // TOP 3 업데이트
      const updateTop3 = (slot, field, value) => {
        setTopThree(prev => prev.map(t => t.slot === slot ? { ...t, [field]: value } : t));
      };

      return (
        <div className="db-root">
          {focusMode && <FocusMode tasks={tasks} topThree={topThree} toggleTask={toggleTask} onClose={() => setFocusMode(false)} />}

          {/* ZONE 1: 드림 스트립 + 자원 미니 (SC2 스타일) */}
          <div className="zone1-wrap">
          <ResourceMini resources={resources} onClick={onOpenResources} />
          <div className="dream-strip">
            {dreams.length === 0 && <div style={{ color: 'var(--text-4)', fontSize: 12, display: 'flex', alignItems: 'center' }}>비전&성장 탭에서 드림을 추가하세요</div>}
            {dreams.map(d => {
              const pct = d.targetAmount > 0 ? Math.min(100, Math.round((d.currentAmount / d.targetAmount) * 100)) : 0;
              const blur = ((1 - pct / 100) * 14).toFixed(1);
              const gray = Math.round((1 - pct / 100) * 85);
              return (
                <div key={d.id} className="dream-strip-card">
                  {d.imgUrl
                    ? <img src={d.imgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${blur}px) grayscale(${gray}%)` }} />
                    : <div className="dsc-bg">{d.emoji || '⭐'}</div>
                  }
                  <div className="dsc-overlay">
                    <div className="dsc-name">{d.name}</div>
                    <div className="dsc-bar"><div className="dsc-bar-fill" style={{ width: `${pct}%` }} /></div>
                    <div className="dsc-pct">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* ZONE 2: 달성률 헤더 */}
          <div className="db-header">
            <div className="db-header-rate">
              <span className="big-num">{overall}</span>
              <span className="big-pct">% 전체 달성</span>
            </div>
            <div className="db-header-bar"><div className="db-header-bar-fill" style={{ width: `${overall}%` }} /></div>
            <div className="db-header-divider" />
            <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'Geist Mono, monospace' }}>{`W${getWeekNumber()}`}</span>
            <div className="db-streak-row">
              {dayLabels.map((d, i) => (
                <div key={i} className={"streak-dot" + (i > todayIdx ? " future" : streak[i] ? " done" : i === todayIdx ? " today" : " past")} onClick={() => toggleStreakDay(i)} style={{ width: 20, height: 20, fontSize: 9 }}>{d}</div>
              ))}
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace', marginLeft: 6 }}>🔥{streakCount}일</span>
            </div>
            <div className="db-header-divider" />
            <div className="heatmap-row" title="최근 28일 달성 현황">
              {heatmapCells.map(c => (
                <div key={c.key} className={`heatmap-cell ${c.lv} ${c.isToday ? 'today' : ''}`} />
              ))}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={() => setFocusMode(true)} style={{ background: 'var(--accent)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
                ⚡ 집중 모드
              </button>
            </div>
          </div>

          {/* BODY: 사이드 + 메인 */}
          <div className="db-body">
            {/* 좌측 스탯 패널 (2-col grid, 캐릭터 클래스) */}
            <div className="db-side">
              <div className="stat-panel-head">
                <span className="who"><span className="ic">⚔️</span>플레이어</span>
                <span className="all-lv">종합 Lv.<strong>{stats.reduce((a, s) => a + statLevel(getStatTotalXp(s)), 0)}</strong></span>
              </div>
              <div className="stat-2col">
                {stats.map(s => {
                  const tx = getStatTotalXp(s);
                  const lv = statLevel(tx);
                  const prog = statLevelProgress(tx);
                  return (
                    <div key={s.id} className="stat-2col-item" onClick={() => onOpenStatModal && onOpenStatModal()}>
                      <div className="stat-2col-top">
                        <span className="stat-2col-name"><span className="ic">{s.icon}</span>{s.label}</span>
                        <span className="stat-2col-lv">Lv.<strong>{lv}</strong></span>
                      </div>
                      <div className="stat-2col-bar"><div className="stat-2col-bar-fill" style={{ width: `${prog.pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              <button className="stat-detail-btn" onClick={() => onOpenStatModal && onOpenStatModal()}>상세 보기</button>
            </div>

            {/* 메인 */}
            <div className="db-main">
              {/* ZONE 3: 목표 카드들 */}
              <div className="db-zone3">
                {goals.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                    목표 관리 탭에서 목표를 추가하세요
                  </div>
                )}
                {goals.map(g => {
                  const dday = calcDday(g.deadline);
                  const gTasks = tasksByGoal[g.id] || [];
                  const activeMilestone = g.milestones ? g.milestones.find(m => m.status === 'active') : null;
                  return (
                    <div key={g.id} className="db-goal-col">
                      <div className="db-goal-col-head">
                        <div style={{ flex: 1 }}>
                          <div className="db-goal-cat">{g.category}</div>
                          <div className="db-goal-name">{g.name}</div>
                          <div className="db-goal-meta">
                            <span style={{ color: dday <= 30 ? 'var(--red)' : dday <= 90 ? 'var(--amber)' : 'var(--accent)', fontWeight: 600 }}>D-{dday}</span>
                            <span style={{ color: 'var(--text-4)' }}>·</span>
                            <span style={{ color: 'var(--text-3)' }}>{fmtDeadline(g.deadline)}</span>
                          </div>
                        </div>
                        <RingChart value={g.progress} size={42} stroke={4} />
                      </div>
                      {activeMilestone && (
                        <div className="db-goal-stage">
                          <div className="db-goal-stage-label">진행중인 단계</div>
                          <div className="db-goal-stage-name">{activeMilestone.name}</div>
                          <div className="mini-bar" style={{ marginTop: 6 }}>
                            <div className="mini-bar-fill" style={{ width: `${activeMilestone.kpi ? Math.min(100, (activeMilestone.kpi.current / activeMilestone.kpi.target) * 100) : 50}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="db-goal-tasks">
                        <div className="db-goal-tasks-label">⚡ 연결된 할 일</div>
                        {gTasks.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-4)' }}>연결된 할 일 없음</div>}
                        {gTasks.map(t => (
                          <div key={t.id} className={"check-item" + (t.done ? " done" : "")} onClick={() => toggleTask(t.id)} style={{ padding: '3px 0' }}>
                            <div className="check-box" />
                            <div className="check-text" style={{ fontSize: 12 }}>{t.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ZONE 4: 하단 3열 */}
              <div className="db-zone4">
                {/* 이번주 목표 */}
                <div className="db-zone4-col">
                  <div className="db-zone4-title">
                    이번주 목표
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400 }}>{weeklyGoals.filter(w=>w.done).length}/{weeklyGoals.length} · W{getWeekNumber()}</span>
                  </div>
                  <input className="next-week-input" placeholder="+ Enter 눌러서 추가" onKeyDown={e => { if (e.key === "Enter" && e.target.value.trim()) { setWeeklyGoals(prev => [...prev, { id: "w" + Date.now(), text: e.target.value.trim(), done: false }]); e.target.value = ""; } }} />
                  {weeklyGoals.map(w => (
                    <div key={w.id} className={"check-item" + (w.done ? " done" : "")} onClick={() => { if (editingWeeklyId !== w.id) toggleWeeklyGoal(w.id); }}>
                      <div className="check-box" />
                      {editingWeeklyId === w.id ? (
                        <input className="check-text" value={editingWeeklyText} onChange={e => setEditingWeeklyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { editWeeklyGoal(w.id, editingWeeklyText); setEditingWeeklyId(null); } if (e.key === "Escape") setEditingWeeklyId(null); }}
                          onBlur={() => { editWeeklyGoal(w.id, editingWeeklyText); setEditingWeeklyId(null); }}
                          onClick={e => e.stopPropagation()} autoFocus
                          style={{ background: 'var(--bg-3)', border: '1px solid var(--accent)', borderRadius: 4, color: 'var(--text-1)', padding: '2px 6px', fontFamily: 'Geist, sans-serif', fontSize: 12, flex: 1 }} />
                      ) : (
                        <div className="check-text" style={{ fontSize: 12 }} onDoubleClick={e => { e.stopPropagation(); setEditingWeeklyId(w.id); setEditingWeeklyText(w.text); }}>{w.text}</div>
                      )}
                      <button className="btn-del" onClick={e => { e.stopPropagation(); deleteWeeklyGoal(w.id); }} style={{ fontSize: 11 }}>×</button>
                    </div>
                  ))}
                </div>

                {/* TOP 3 */}
                <div className="db-zone4-col">
                  <div className="db-zone4-title">오늘의 TOP 3</div>
                  {topThree.map(t => (
                    <div key={t.slot} className="top3-item">
                      <span className="top3-num">{t.slot}</span>
                      <div className={"top3-check" + (t.done ? " checked" : "")} onClick={() => updateTop3(t.slot, 'done', !t.done)}>
                        {t.done && <span style={{ fontSize: 9, color: '#fff' }}>✓</span>}
                      </div>
                      <input
                        className={"top3-input" + (t.done ? " top3-done" : "")}
                        value={t.text}
                        placeholder={`${t.slot}번째 우선순위`}
                        onChange={e => updateTop3(t.slot, 'text', e.target.value)}
                      />
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-4)' }}>매일 자정 자동 초기화</div>
                </div>

                {/* 다음주 목표 */}
                <div className="db-zone4-col">
                  <div className="db-zone4-title">
                    다음주 목표
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400 }}>W{getWeekNumber() + 1}</span>
                  </div>
                  {nextWeekGoals.map(w => (
                    <div key={w.id} className={"check-item" + (w.done ? " done" : "")} onClick={() => setNextWeekGoals(prev => prev.map(g => g.id === w.id ? { ...g, done: !g.done } : g))}>
                      <div className="check-box" />
                      <div className="check-text" style={{ fontSize: 12 }}>{w.text}</div>
                    </div>
                  ))}
                  <input className="next-week-input" placeholder="+ Enter 눌러서 추가" onKeyDown={addNextWeek} />
                </div>
              </div>
            </div>
          </div>
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
                    <div className="retro-summary-item-value" style={{ fontSize: 12 }}>{bestGoal ? bestGoal.name : '—'}</div>
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
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
                  이 내용으로 회고 초안 채우기
                </button>
              </div>
            );
          })()}

          <div className="retro-editor">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>이번주 회고 · W{getWeekNumber()}</div>
              <div style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 11.5, color: "var(--text-3)" }}>{new Date().getFullYear()}.{getWeekRange(0)}</div>
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
                  <span style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 11, color: "var(--text-4)" }}>{r.date}</span>
                  <button onClick={() => setRetros(prev => prev.filter(x => x.id !== r.id))}
                    style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", fontSize: 13, padding: "2px 6px" }}>×</button>
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
    function VisionTab({ vision, setVision, stats, setStats, dreams, setDreams }) {
      const [expandedStat, setExpandedStat] = useState(null);
      const [expandedDream, setExpandedDream] = useState(null);

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
          <div className="section-head">
            <div>
              <div className="section-title">비전 & 성장</div>
              <div className="section-sub">나의 큰 그림과 현재 레벨을 한눈에</div>
            </div>
          </div>

          <div className="vision-mission">
            <div className="vision-mission-label"><span className="dot-purple" />나의 사명</div>
            <input className="vision-mission-input" value={vision.mission}
              onChange={e => setVision(v => ({ ...v, mission: e.target.value }))}
              placeholder="내가 이 모든 것을 하는 이유는..." />
          </div>

          {/* Dream Board — 사명 바로 아래 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div className="card-title"><span className="dot-purple"/>드림 보드</div>
            <button className="btn btn-ghost" style={{ fontSize:12, padding:"6px 12px" }} onClick={addDream}>+ 추가</button>
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
                <div key={d.id} className={"dream-card" + (isOpen ? " dream-open" : "")}>
                  <div className="dream-img-wrap" onClick={() => setExpandedDream(isOpen ? null : d.id)}>
                    {d.imgUrl ? (
                      <img src={d.imgUrl} className="dream-img" alt="" style={{ filter:`blur(${blur}px) grayscale(${gray}%)` }} />
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                        <span style={{ fontSize:32 }}>{d.emoji || "⭐"}</span>
                        <span style={{ fontSize:11, color:"var(--text-4)" }}>이미지 URL 입력</span>
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

                  {isOpen && (
                    <div className="dream-expand">
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                        <div className="dream-input-row">
                          <label>이름</label>
                          <input className="char-input" style={{ flex:1, textAlign:"left" }} value={d.name}
                            onChange={e => updateDream(d.id, "name", e.target.value)} />
                        </div>
                        <div className="dream-input-row">
                          <label>목표 금액</label>
                          <input className="char-input dream-num-input" type="number" value={d.targetAmount}
                            onChange={e => updateDream(d.id, "targetAmount", Number(e.target.value) || 0)} />
                          <span className="dream-unit">{d.unit}</span>
                        </div>
                        <div className="dream-input-row">
                          <label>현재 자산</label>
                          <input className="char-input dream-num-input" type="number" value={d.currentAmount}
                            onChange={e => updateDream(d.id, "currentAmount", Number(e.target.value) || 0)} />
                          <span className="dream-unit">{d.unit}</span>
                        </div>
                        <div className="dream-input-row">
                          <label>이미지 URL</label>
                          <input className="char-input" style={{ flex:1, textAlign:"left", fontSize:11 }} value={d.imgUrl}
                            onChange={e => updateDream(d.id, "imgUrl", e.target.value)} placeholder="https://..." />
                        </div>
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
                            <span className="dream-unit">{d.unit}</span>
                          </div>
                          {needed <= 0 ? (
                            <div className="dream-calc-result"><span className="dream-calc-big" style={{color:"var(--green)"}}>이미 달성! 🎉</span></div>
                          ) : timeResult ? (
                            <div className="dream-calc-result">
                              <span className="dream-calc-big">{timeResult.y > 0 ? `${timeResult.y}년 ` : ""}{timeResult.m}개월 후</span>
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
                              <span className="dream-calc-big">월 {reqMonthly.toLocaleString()} {d.unit}</span>
                              <span className="dream-calc-sub">필요 월 저축액</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setDreams(prev => prev.filter(x => x.id !== d.id))}
                        style={{ background: "transparent", border: "1px solid var(--red)", borderRadius: 6, color: "var(--red)", fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "Geist, sans-serif", marginTop: 8 }}>
                        드림 삭제
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="add-goal-card" onClick={addDream} style={{ minHeight:180 }}>
              <span className="plus">+</span>새 드림 추가하기
            </div>
          </div>

          {/* 캐릭터 스탯 — 레이더 차트 + 컴팩트 리스트 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div className="card-title"><span className="dot-purple"/>캐릭터 스탯</div>
            <span style={{ fontSize:11.5, color:"var(--text-3)" }}>항목 클릭 → 수정</span>
          </div>
          <div className="stat-panel">
            <RadarChart stats={stats} size={200} />
            <div className="stat-list">
              {stats.map(s => {
                const isOpen = expandedStat === s.id;
                const nextLvXp = (Math.floor(s.xp / 20) + 1) * 20;
                return (
                  <div key={s.id}>
                    <div className="stat-compact-row" onClick={() => setExpandedStat(isOpen ? null : s.id)}>
                      <span className="stat-compact-icon">{s.icon}</span>
                      <span className="stat-compact-name">{s.label}</span>
                      <span className="stat-compact-lv">Lv.<strong>{s.level}</strong></span>
                      <div className="stat-compact-bar">
                        <div className="stat-compact-fill" style={{ width:`${s.xp}%` }}/>
                      </div>
                      <svg style={{ width:13, height:13, flexShrink:0, color:"var(--text-4)", transition:"transform 0.2s", transform:isOpen?"rotate(90deg)":"none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
                    </div>
                    {isOpen && (
                      <div className="stat-expand-inline">
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--text-4)", marginBottom:7, fontFamily:"Geist Mono, ui-monospace, monospace" }}>
                          <span>XP {s.xp} / 100</span>
                          <span>다음 레벨까지 {Math.max(0, nextLvXp - s.xp)} XP</span>
                        </div>
                        <div className="char-xp-bar" style={{ marginBottom:12 }}>
                          <div className="char-xp-fill" style={{ width:`${s.xp}%` }}/>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:12.5, color:"var(--text-2)", flex:1 }}>{s.desc} 현재값</span>
                          <input className="char-input" type="number" style={{ width:100, textAlign:"right" }}
                            value={s.value} onChange={e => updateStat(s.id, e.target.value)} />
                          <span style={{ fontSize:12, color:"var(--text-3)" }}>{s.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="big-timeline">
            <div className="card-title" style={{ marginBottom:18 }}><span className="dot-purple"/>큰 계획 타임라인</div>
            <div className="bigt-track">
              {vision.timeline.map(yr => (
                <div key={yr.year} className={"bigt-year" + (yr.current ? " current" : "")}>
                  <div className="bigt-year-label">
                    <span className="bigt-ydot" />{yr.year}
                    {yr.current && <span style={{ fontSize:9.5, color:"var(--accent)", fontFamily:"Geist Mono, ui-monospace, monospace" }}>NOW</span>}
                  </div>
                  <div className="bigt-items">
                    {yr.items.map((it, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div className={"bigt-item " + it.state} style={{ flex:1 }}>{it.text}</div>
                        <button onClick={() => setVision(v => ({ ...v, timeline: v.timeline.map(y => y.year === yr.year ? { ...y, items: y.items.filter((_, idx) => idx !== i) } : y) }))}
                          style={{ background:"transparent", border:"none", color:"var(--text-4)", cursor:"pointer", fontSize:12, padding:"1px 5px", flexShrink:0 }}>×</button>
                      </div>
                    ))}
                    <input
                      placeholder="+ 항목 추가 (Enter)"
                      style={{ marginTop:6, background:"var(--bg-3)", border:"1px solid var(--border)", borderRadius:5, color:"var(--text-2)", fontSize:11, padding:"4px 8px", fontFamily:"Geist, sans-serif", width:"100%" }}
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

      return (
        <div className="focus-overlay">
          <button className="focus-exit" onClick={onClose}>✕</button>
          <div className="focus-context">
            집중 모드 · {idx + 1} / {items.length}
          </div>
          <div className="focus-task-box">
            <div className="focus-task-text">{current ? current.text : "할 일이 없습니다"}</div>
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
            <button className="focus-btn" onClick={() => { setSeconds(25*60); setRunning(false); }}>↺ 초기화</button>
            <button className="focus-btn" onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))}>다음 →</button>
          </div>
          <div className="focus-progress">
            {items.map((it, i) => (
              <div key={i} className={"focus-dot" + (i < idx ? " done" : i === idx ? " active" : "")} />
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
            <button className="btn" onClick={() => setShowAddForm(v => !v)}><span style={{fontSize:14}}>+</span>새 목표 추가</button>
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
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-4)", fontSize: 13 }}>목표가 없습니다</div>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 11.5 }}>
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
                              <span style={{ fontFamily: "Geist Mono, ui-monospace, monospace", color: "var(--text-4)", marginRight: 8, fontSize: 11.5 }}>
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
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 14, fontSize: 11, color: "var(--text-3)" }}>
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
                    style={{ background: filter === tag ? "var(--accent)" : "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: filter === tag ? "#fff" : "var(--text-3)", fontSize: 11, padding: "4px 10px", cursor: "pointer", fontFamily: "Geist, sans-serif" }}>
                    {tag === "all" ? "전체" : tag}
                  </button>
                ))}
              </div>
              <button className="btn" onClick={() => setShowAddForm(v => !v)}><span style={{fontSize:14}}>+</span>태스크 추가</button>
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
                      <button key={q} onClick={() => setNewQuadrant(q)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: newQuadrant === q ? "1px solid var(--accent)" : "1px solid var(--border)", background: newQuadrant === q ? "var(--accent-soft)" : "var(--bg-3)", color: newQuadrant === q ? "var(--accent)" : "var(--text-3)", cursor: "pointer", fontFamily: "Geist, sans-serif", fontSize: 12, fontWeight: 600 }}>{q}</button>
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
                <span style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "Geist Mono, ui-monospace, monospace" }}>
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
              <span style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "Geist Mono, ui-monospace, monospace" }}>
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
                        style={{ background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--text-1)", padding: "2px 6px", fontFamily: "Geist, sans-serif", fontSize: 13 }}
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
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>아이콘 / 이름 / 총 XP / 단위 / 삭제</div>
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
      if (!open) return null;
      const update = (k, v) => setSettings((prev) => ({ ...prev, [k]: v }));
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-box" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">⚙️ 설정</div>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <div className="settings-section-title">🤖 AI 연동</div>
                <div className="settings-field">
                  <label>Gemini API Key</label>
                  <input type="password" value={settings.geminiKey || ""} onChange={(e) => update("geminiKey", e.target.value)} placeholder="AIza..." />
                </div>
                <div className="settings-hint">Gemini 2.5 Flash · Stage 3에서 자동 추천·이미지 생성 활성화</div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">⏰ 시간·에너지</div>
                <div className="settings-field">
                  <label>주간 시간풀</label>
                  <input type="number" value={settings.weeklyTimePool || 72} onChange={(e) => update("weeklyTimePool", Number(e.target.value) || 72)} />
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>시간 / 주</span>
                </div>
                <div className="settings-hint">기본 72h (12h × 6일)</div>
                <div className="settings-field" style={{ marginTop: 12 }}>
                  <label>주간 에너지풀</label>
                  <input type="number" value={settings.weeklyEnergyPool || 100} onChange={(e) => update("weeklyEnergyPool", Number(e.target.value) || 100)} />
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>포인트 / 주</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">계정</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", padding: "4px 0" }}>{ALLOWED_EMAIL}</div>
                <button onClick={onLogout} style={{ marginTop: 10, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-3)", fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "Geist, sans-serif" }}>로그아웃</button>
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
    function GoalsTasksRetroTab({
      goals, setGoals, addGoal, editGoal, deleteGoal,
      tasks, toggleTask, addTask, editTask, deleteTask,
      retros, setRetros, dailyLog, stats
    }) {
      const [openGoalId, setOpenGoalId] = useState(null);
      const [editingGoalId, setEditingGoalId] = useState(null);
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
        editGoal(id, {
          name: editGoalForm.name,
          category: editGoalForm.category,
          deadline: editGoalForm.deadline,
          progress: Number(editGoalForm.progress) || 0,
          statId: editGoalForm.statId || null
        });
        setEditingGoalId(null);
      };

      const handleAddTask = () => {
        if (!newTask.text.trim()) return;
        addTask({
          id: "t" + Date.now(),
          text: newTask.text.trim(),
          quadrant: Number(newTask.quadrant) || 2,
          goalId: newTask.goalId || null,
          tag: newTask.tag.trim() || "",
          done: false,
          time: ""
        });
        setNewTask({ text: "", quadrant: 2, goalId: "", tag: "" });
        setShowAddTask(false);
      };

      const saveRetro = () => {
        if (!retroGood && !retroBad && !retroImprove) return;
        setRetros((prev) => [{
          id: "r" + Date.now(),
          week: "W" + getWeekNumber() + " · " + new Date().getFullYear(),
          date: getWeekRange(0),
          good: retroGood, bad: retroBad, improve: retroImprove
        }, ...prev]);
        setRetroGood(""); setRetroBad(""); setRetroImprove("");
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
          <div className="gtr-split">
            {/* ── LEFT: GOALS ── */}
            <div className="gtr-col">
              <div className="gtr-col-head">
                <div className="gtr-col-title">
                  🎯 목표 <span className="gtr-col-count">{goals.length}</span>
                </div>
                <button className="gtr-btn-add" onClick={() => setShowAddGoal((v) => !v)}>
                  {showAddGoal ? "✕" : "+ 추가"}
                </button>
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
                  <div key={g.id} className={"gmini" + (isOpen ? " open" : "")} onClick={() => !isEditing && setOpenGoalId(isOpen ? null : g.id)}>
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

                    {isEditing && (
                      <div className="inline-add-form" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                        <input value={editGoalForm.name} onChange={(e) => setEditGoalForm({ ...editGoalForm, name: e.target.value })} />
                        <div className="inline-add-form-row">
                          <input value={editGoalForm.category} onChange={(e) => setEditGoalForm({ ...editGoalForm, category: e.target.value })} />
                          <input type="date" value={editGoalForm.deadline} onChange={(e) => setEditGoalForm({ ...editGoalForm, deadline: e.target.value })} />
                        </div>
                        <div className="inline-add-form-row">
                          <input type="number" min="0" max="100" value={editGoalForm.progress} onChange={(e) => setEditGoalForm({ ...editGoalForm, progress: e.target.value })} placeholder="진행률 %" />
                          <select value={editGoalForm.statId} onChange={(e) => setEditGoalForm({ ...editGoalForm, statId: e.target.value })}>
                            <option value="">스탯 미연결</option>
                            {stats.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                          </select>
                        </div>
                        <div className="inline-add-buttons">
                          <button onClick={() => setEditingGoalId(null)}>취소</button>
                          <button className="save" onClick={() => saveEditGoal(g.id)}>저장</button>
                        </div>
                      </div>
                    )}

                    {isOpen && !isEditing && (
                      <div className="gmini-expand" onClick={(e) => e.stopPropagation()}>
                        {gTasks.length === 0
                          ? <div style={{ fontSize: 11, color: "var(--text-4)", padding: "4px 0" }}>연결된 할 일 없음</div>
                          : gTasks.map((t) => (
                              <div key={t.id} className={"gmini-expand-task" + (t.done ? " done" : "")} onClick={() => toggleTask(t.id)}>
                                <div className="cb" />
                                <span>{t.text}</span>
                                <span className="qtag">Q{t.quadrant}</span>
                              </div>
                            ))}
                        <div className="gmini-actions">
                          <button className="gmini-act-btn" onClick={() => startEditGoal(g)}>✏️ 수정</button>
                          <button className="gmini-act-btn del" onClick={() => { if (confirm("삭제하시겠어요?")) deleteGoal(g.id); }}>🗑 삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 미연결 할일 */}
              <div className="unlinked-section">
                <div className="unlinked-section-title">⚡ 미연결 할 일 ({unlinkedTasks.length})</div>
                {unlinkedTasks.length === 0 && <div style={{ fontSize: 11, color: "var(--text-4)" }}>모든 할일이 목표에 연결됨</div>}
                {unlinkedTasks.map((t) => (
                  <div key={t.id} className={"unlinked-task" + (t.done ? " done" : "")} onClick={() => toggleTask(t.id)}>
                    <div className="cb" />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                    <span className="qtag">Q{t.quadrant}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MIDDLE: TASKS 4분면 ── */}
            <div className="gtr-col">
              <div className="gtr-col-head">
                <div className="gtr-col-title">
                  📋 업무 4분면 <span className="gtr-col-count">{tasks.length}</span>
                </div>
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
                    <select value={newTask.goalId} onChange={(e) => setNewTask({ ...newTask, goalId: e.target.value })}>
                      <option value="">목표 미연결</option>
                      {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <input value={newTask.tag} onChange={(e) => setNewTask({ ...newTask, tag: e.target.value })} placeholder="태그 (예: 유튜브)" />
                  <div className="inline-add-buttons">
                    <button onClick={() => setShowAddTask(false)}>취소</button>
                    <button className="save" onClick={handleAddTask}>저장</button>
                  </div>
                </div>
              )}

              <div className="eisen-4">
                {QUADRANTS.map((q) => {
                  const qt = tasks.filter((t) => t.quadrant === q.id);
                  return (
                    <div key={q.id} className="eq-cell">
                      <div className="eq-cell-head">
                        <div className="eq-cell-title">
                          <span className={"qd " + q.dot} />{q.num} · {q.title}
                        </div>
                        <span className="eq-cell-count">{qt.filter((t) => t.done).length}/{qt.length}</span>
                      </div>
                      <div className="eq-cell-body">
                        {qt.length === 0 && <div style={{ fontSize: 11, color: "var(--text-4)", padding: "8px 0", textAlign: "center" }}>없음</div>}
                        {qt.map((t) => {
                          const g = t.goalId ? goals.find((x) => x.id === t.goalId) : null;
                          return (
                            <div key={t.id} className={"eq-task-row" + (t.done ? " done" : "")} onClick={() => toggleTask(t.id)}>
                              <div className="cb" />
                              <span className="eq-task-text">{t.text}</span>
                              {g && <span className="gtag">{g.name.slice(0, 8)}</span>}
                              <button className="del-x" onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}>×</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── RIGHT: RETRO ── */}
            <div className="gtr-col">
              <div className="gtr-col-head">
                <div className="gtr-col-title">📝 회고</div>
                <button className="gtr-btn-add" onClick={saveRetro}>저장</button>
              </div>

              <div className="retro-mini-summary">
                <div className="retro-mini-summary-title">📊 W{getWeekNumber()} 자동 요약</div>
                <div className="retro-mini-row"><span className="lbl">완료 태스크</span><span className="val">{completedThisWeek}개</span></div>
                <div className="retro-mini-row"><span className="lbl">평균 달성률</span><span className="val">{avgRate}%</span></div>
                <div className="retro-mini-row"><span className="lbl">활동일</span><span className="val">{weekEntries.length}/7</span></div>
                {bestGoal && (
                  <div className="retro-mini-row"><span className="lbl">최고 진행</span><span className="val" style={{ fontSize: 10.5 }}>{bestGoal.name.slice(0, 12)} {bestGoal.progress}%</span></div>
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
                      <button onClick={() => setRetros((p) => p.filter((x) => x.id !== r.id))} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 0, fontSize: 12 }}>×</button>
                    </div>
                    {r.good && <div className="retro-history-text">✓ {r.good}</div>}
                    {r.improve && <div className="retro-history-text" style={{ color: "var(--accent)", marginTop: 3 }}>→ {r.improve}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* ─── Stage 2: ResourcesItemsTab (placeholder) ─── */
    function ResourcesItemsTab({ resources, setResources }) {
      return (
        <div className="panel-enter">
          <div className="ri-placeholder">
            <div className="big">⚔️ 🎒</div>
            <div className="title">자원 · 아이템 인벤토리</div>
            <div className="sub">
              Stage 3에서 구현됩니다.<br />
              자원 현황 (💰 돈 · ⚡ 에너지 · ⏰ 시간)과<br />
              디아블로 스타일 아이템 인벤토리 (장착 / 개발중 / 보관)가 좌우 분할로 표시됩니다.<br /><br />
              현재 자원: 수입 +{(resources.money?.income || 0).toLocaleString()}원 / 지출 -{(resources.money?.expenses || 0).toLocaleString()}원
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
      const [settings, setSettings] = useState(() => loadLS("dreamboard_settings", INITIAL_SETTINGS));
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
            if (d.goals) setGoals(d.goals);
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
          }
          setLoaded(true);
        });
      }, [user.uid]);

      // 변경 시 1.5초 후 Firestore에 저장 (debounce)
      useEffect(() => {
        if (!loaded) return;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          _db.collection("users").doc(user.uid).set(
            { tasks, weeklyGoals, goals, stats, retros, vision, dreams, nextWeekGoals, streak, topThree, dailyLog, resources }
          );
        }, 1500);
      }, [tasks, weeklyGoals, goals, stats, retros, vision, dreams, nextWeekGoals, streak, topThree, dailyLog, resources, loaded]);

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
          // 완료 전환 → XP 부여
          if (willBeDone) {
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', color: 'var(--text-3)', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
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
            return (
              <div className="topbar">
                <div className="brand">
                  <div className="brand-mark" />
                  <div className="brand-name">DreamBoard</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="player-bar">
                    <span className="pb-lv">Lv.{totalLv}</span>
                    <div className="pb-bar"><div className="pb-bar-fill" style={{ width: `${Math.min(100, (totalXp / maxXpAtLv60) * 100)}%` }} /></div>
                    <span className="pb-xp">{totalXp.toLocaleString()} XP</span>
                    {streakCount > 0 && <span className="pb-streak">🔥{streakCount}</span>}
                  </div>
                  <button className="gear-btn" onClick={() => setSettingsOpen(true)} title="설정">⚙</button>
                </div>
              </div>
            );
          })()}

          <Tabs active={tab} onChange={setTab} />

          {tab === "dashboard" && <Dashboard
            goals={goals} tasks={tasks} toggleTask={toggleTask}
            weeklyGoals={weeklyGoals} toggleWeeklyGoal={toggleWeeklyGoal}
            editWeeklyGoal={editWeeklyGoal} deleteWeeklyGoal={deleteWeeklyGoal}
            setWeeklyGoals={setWeeklyGoals} stats={stats} dreams={dreams}
            nextWeekGoals={nextWeekGoals} setNextWeekGoals={setNextWeekGoals}
            streak={streak} setStreak={setStreak}
            topThree={topThree} setTopThree={setTopThree}
            dailyLog={dailyLog} focusMode={focusMode} setFocusMode={setFocusMode}
            resources={resources}
            onOpenStatModal={() => setStatModalOpen(true)}
            onOpenResources={() => setTab("resources")}
          />}
          {tab === "gtr" && <GoalsTasksRetroTab
            goals={goals} setGoals={setGoals} addGoal={addGoal} editGoal={editGoal} deleteGoal={deleteGoal}
            tasks={tasks} toggleTask={toggleTask} addTask={addTask} editTask={editTask} deleteTask={deleteTask}
            retros={retros} setRetros={setRetros} dailyLog={dailyLog} stats={stats}
          />}
          {tab === "resources" && <ResourcesItemsTab resources={resources} setResources={setResources} />}
          {tab === "vision" && <VisionTab vision={vision} setVision={setVision} stats={stats} setStats={setStats} dreams={dreams} setDreams={setDreams} />}

          <div className="kbd-hints">
            <span>키보드</span>
            <span><span className="kbd">1</span> 대시보드</span>
            <span><span className="kbd">2</span> 목표·업무</span>
            <span><span className="kbd">3</span> 자원·아이템</span>
            <span><span className="kbd">4</span> 비전·드림</span>
            <span style={{ marginLeft: "auto" }}>할일 완료 시 XP 획득 · 스트릭 보너스 ×1.25</span>
          </div>

          {xpToast && <XpToast event={xpToast} />}

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
        </div>
      );
    }

    /* ---------- Login / Root ---------- */
    function LoginScreen({ onLogin }) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', fontFamily: 'Geist, sans-serif', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="brand-mark" />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>DreamBoard</span>
          </div>
          <p style={{ color: 'var(--text-4)', fontSize: 13, margin: 0 }}>개인 목표 대시보드 · 로그인이 필요합니다</p>
          <button onClick={onLogin} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text-1)', fontSize: 14, fontWeight: 500, padding: '12px 24px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google로 로그인
          </button>
        </div>
      );
    }

    function AccessDenied({ onLogout }) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', fontFamily: 'Geist, sans-serif', gap: 16 }}>
          <p style={{ color: 'var(--red)', fontSize: 15, fontWeight: 600, margin: 0 }}>접근 권한이 없습니다</p>
          <p style={{ color: 'var(--text-4)', fontSize: 13, margin: 0 }}>허가된 계정으로만 접근 가능합니다</p>
          <button onClick={onLogout} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontSize: 13, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>다른 계정으로 로그아웃</button>
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', color: 'var(--text-4)', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
          로딩 중...
        </div>
      );
      if (!user) return <LoginScreen onLogin={signIn} />;
      if (user.email !== ALLOWED_EMAIL) return <AccessDenied onLogout={() => _auth.signOut()} />;
      return <App user={user} />;
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<Root />);

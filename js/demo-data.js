import { DEMOGRAPHICS } from "../data/demographics.js";
import { APARTMENT_BASELINE_VERSION, INITIAL_APARTMENTS } from "./data.js";

// 見本データ。実在の活動記録ではなく、画面の見え方を確かめるためのもの。
export const DEMO_ACCOUNT_NAME = "デモ（見本データ）";

const MATERIALS = [
  { id: "demo-material-report", name: "活動報告レポート", active: true },
  { id: "demo-material-news", name: "区政ニュース", active: true },
  { id: "demo-material-leaflet", name: "リーフレット", active: true }
];

const WORKERS = ["本人", "事務所スタッフ", "ボランティアA", "ボランティアB"];

// 活動ごとの体制。人数を枚数だけで決めると「本人が1人で全部配った」記録になり、
// 担当者別の内訳が1本の棒になってしまうため、実際に近い組み合わせを順に当てる
const TEAMS = [
  ["本人"],
  ["本人", "ボランティアA"],
  ["事務所スタッフ", "ボランティアB"],
  ["本人", "事務所スタッフ"],
  ["本人"],
  ["本人", "ボランティアA", "ボランティアB"],
  ["事務所スタッフ"],
  ["本人", "ボランティアB"]
];

// 配布計画。町丁目ごとに「世帯数に対する到達率」を先に決め、そこから枚数を逆算する。
// 枚数を直接書くと世帯数との釣り合いが崩れ、地図の色が意図と食い違うため。
// daysAgo は基準日からの日数。古い順＝地盤を先に回り、最近は新しい地域へ広げた形。
const COVERAGE_PLAN = [
  // 地盤。到達率が高く、最後に回ってから日が経っている（地図の「経過日数」が赤くなる）
  { area: "中延2丁目", ratio: .88, daysAgo: 176, spacing: 14, sessions: 3, apartmentShare: .3, materials: ["demo-material-report"] },
  { area: "旗の台3丁目", ratio: .90, daysAgo: 169, spacing: 12, sessions: 2, apartmentShare: .25, materials: ["demo-material-report"] },
  { area: "二葉1丁目", ratio: .82, daysAgo: 162, spacing: 10, sessions: 4, apartmentShare: .35, materials: ["demo-material-report", "demo-material-leaflet"] },
  // 配布中
  { area: "荏原4丁目", ratio: .55, daysAgo: 118, spacing: 13, sessions: 3, apartmentShare: .4, materials: ["demo-material-news"] },
  { area: "戸越5丁目", ratio: .60, daysAgo: 104, spacing: 11, sessions: 3, apartmentShare: .45, materials: ["demo-material-news", "demo-material-leaflet"] },
  { area: "小山3丁目", ratio: .45, daysAgo: 96, spacing: 12, sessions: 3, apartmentShare: .55, materials: ["demo-material-news"] },
  { area: "中延5丁目", ratio: .50, daysAgo: 76, spacing: 14, sessions: 2, apartmentShare: .3, materials: ["demo-material-news"] },
  // 着手したばかり（直近に回った地域）
  { area: "西大井1丁目", ratio: .30, daysAgo: 41, spacing: 13, sessions: 2, apartmentShare: .5, materials: ["demo-material-leaflet"] },
  { area: "東大井5丁目", ratio: .22, daysAgo: 33, spacing: 12, sessions: 2, apartmentShare: .45, materials: ["demo-material-leaflet"] },
  { area: "大井1丁目", ratio: .18, daysAgo: 17, spacing: 9, sessions: 2, apartmentShare: .6, materials: ["demo-material-leaflet", "demo-material-news"] },
  { area: "二葉3丁目", ratio: .25, daysAgo: 12, spacing: 0, sessions: 1, apartmentShare: .3, materials: ["demo-material-leaflet"] },
  { area: "南大井6丁目", ratio: .12, daysAgo: 5, spacing: 0, sessions: 1, apartmentShare: .5, materials: ["demo-material-leaflet"] }
];

// マンションの配布可否。戸数の多い順に当てはめる。
// 残りは「未確認」のまま置き、確認が済んでいない物件がある状態を再現する。
const APARTMENT_PLAN = [
  { status: "allowed", daysAgo: 9, reason: "管理人に確認。集合ポストへの投函可。" },
  { status: "prohibited", daysAgo: 21, reason: "チラシ投函禁止の掲示あり。管理組合の方針。" },
  { status: "conditional", daysAgo: 16, reason: "管理事務所へ事前連絡のうえ、平日日中のみ可。" },
  { status: "allowed", daysAgo: 34, reason: "オートロック外の集合ポストへ投函可。" },
  { status: "conditional", daysAgo: 58, reason: "1回につき1種類まで。管理人在室時に限る。" },
  { status: "prohibited", daysAgo: 72, reason: "政治関係の配布物は不可と回答。" },
  { status: "allowed", daysAgo: 88, reason: "投函可。ポストは1階エントランス脇。" },
  { status: "conditional", daysAgo: 104, reason: "管理会社の許可書が必要。次回申請予定。" },
  { status: "allowed", daysAgo: 126, reason: "投函可。" },
  { status: "prohibited", daysAgo: 141, reason: "掲示により投函禁止。" },
  { status: "allowed", daysAgo: 158, reason: "投函可。土日は管理人不在。" },
  { status: "conditional", daysAgo: 173, reason: "郵便受けのみ可。ドアポストは不可。" },
  { status: "allowed", daysAgo: 194, reason: "投函可。" },
  { status: "prohibited", daysAgo: 208, reason: "住民から申し出があり中止。" }
];

const MEMOS = [
  "商店街側は夕方が入りやすい。",
  "オートロックの棟は集合ポストのみ。",
  "雨のため途中で切り上げ。",
  "戸建てが多く時間がかかった。",
  "次回は坂上の区画から。",
  ""
];

const START_TIMES = ["09:30", "10:00", "10:30", "13:30", "14:00", "15:00"];

// 同じ基準日なら毎回同じ見本になるように、乱数は種から作る
const createRandom = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const pad = (value) => String(value).padStart(2, "0");
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

function shiftDays(anchor, days) {
  const date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  date.setDate(date.getDate() - days);
  return date;
}

function addMinutes(time, minutes) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function households(name) {
  return DEMOGRAPHICS.find((item) => item.name === name)?.households || 0;
}

// 計画を「1回ごとの配布」に割る。回ごとの枚数は少しばらつかせるが、合計は目標どおりにする
function planSessions(random) {
  const sessions = [];
  for (const entry of COVERAGE_PLAN) {
    const target = Math.round(households(entry.area) * entry.ratio);
    const weights = Array.from({ length: entry.sessions }, () => .8 + random() * .4);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    let rest = target;
    weights.forEach((weight, index) => {
      const last = index === entry.sessions - 1;
      const distributed = last ? rest : Math.round(target * weight / weightTotal);
      rest -= distributed;
      sessions.push({
        area: entry.area,
        distributed,
        apartmentShare: entry.apartmentShare,
        materials: entry.materials,
        daysAgo: entry.daysAgo - index * entry.spacing
      });
    });
  }
  return sessions.sort((a, b) => b.daysAgo - a.daysAgo);
}

function activityFromSessions(daysAgo, sessions, anchor, random, index) {
  const date = dayKey(shiftDays(anchor, daysAgo));
  const total = sessions.reduce((sum, session) => sum + session.distributed, 0);
  // 枚数が多い日は人数の多い体制を優先して選ぶ
  const candidates = TEAMS.filter((team) => (total >= 1100 ? team.length >= 2 : true));
  const workers = candidates[index % candidates.length];
  const peopleCount = workers.length;
  // 1人1時間あたり180枚前後で歩いた想定。5分単位に丸める
  const minutes = Math.min(240, Math.max(45, Math.round(total / (peopleCount * 180) * 60 / 5) * 5));
  const startTime = START_TIMES[Math.floor(random() * START_TIMES.length)];

  const materialTotals = new Map();
  for (const session of sessions) {
    let rest = session.distributed;
    session.materials.forEach((materialId, position) => {
      const last = position === session.materials.length - 1;
      const amount = last ? rest : Math.round(session.distributed * .6);
      rest -= amount;
      materialTotals.set(materialId, (materialTotals.get(materialId) || 0) + amount);
    });
  }

  return {
    id: `demo-activity-${pad(index + 1)}`,
    date,
    startTime,
    endTime: addMinutes(startTime, minutes),
    durationMinutes: minutes,
    peopleCount,
    workers,
    memo: MEMOS[index % MEMOS.length],
    materials: [...materialTotals.entries()].map(([materialId, distributed]) => {
      // 持ち出した分の余りを残部として持ち帰った形にする（持出-配布=残部）
      const remaining = Math.round(distributed * .05 / 10) * 10;
      return { materialId, taken: distributed + remaining, distributed, remaining, varianceReason: "" };
    }),
    areas: sessions.map((session) => {
      const apartmentCount = Math.round(session.distributed * session.apartmentShare);
      return { area: session.area, distributed: session.distributed, apartmentCount, otherCount: session.distributed - apartmentCount };
    }),
    inputMethod: "manual",
    createdAt: `${date}T${startTime}:00.000Z`,
    updatedAt: `${date}T${startTime}:00.000Z`
  };
}

function buildActivities(anchor, random) {
  const byDay = new Map();
  for (const session of planSessions(random)) {
    if (!byDay.has(session.daysAgo)) byDay.set(session.daysAgo, []);
    byDay.get(session.daysAgo).push(session);
  }
  return [...byDay.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([daysAgo, sessions], index) => activityFromSessions(daysAgo, sessions, anchor, random, index))
    .reverse(); // 保存順に合わせて新しい順で返す
}

function buildApartments(anchor) {
  const ranked = [...INITIAL_APARTMENTS].sort((a, b) => b.units - a.units || a.id.localeCompare(b.id));
  const assigned = new Map(ranked.slice(0, APARTMENT_PLAN.length).map((apartment, index) => [apartment.id, APARTMENT_PLAN[index]]));
  return INITIAL_APARTMENTS.map((apartment) => {
    const plan = assigned.get(apartment.id);
    if (!plan) return structuredClone(apartment);
    const checkedAt = dayKey(shiftDays(anchor, plan.daysAgo));
    return {
      ...structuredClone(apartment),
      postingStatus: plan.status,
      confidence: "verified",
      checkedAt,
      reason: plan.reason,
      history: [{ date: checkedAt, from: "unknown", to: plan.status, reason: plan.reason, createdAt: `${checkedAt}T10:00:00.000Z` }]
    };
  });
}

// 月間目標は実績から逆算する。固定値にすると基準日によって達成済みにも未着手にも見えてしまう
function monthlyGoal(activities, anchor) {
  const key = monthKey(anchor);
  const total = activities
    .filter((activity) => activity.date.slice(0, 7) === key)
    .reduce((sum, activity) => sum + activity.areas.reduce((inner, area) => inner + area.distributed, 0), 0);
  return { [key]: Math.max(500, Math.ceil(total / .62 / 100) * 100) };
}

export function createDemoState(anchor = new Date()) {
  const random = createRandom(20260821);
  const activities = buildActivities(anchor, random);
  return {
    version: 1,
    isDemo: true,
    activities,
    materials: structuredClone(MATERIALS),
    workers: [...WORKERS],
    apartments: buildApartments(anchor),
    apartmentBaselineVersion: APARTMENT_BASELINE_VERSION,
    deletedInitialApartmentIds: [],
    goals: monthlyGoal(activities, anchor),
    importMappings: {},
    updatedAt: `${dayKey(anchor)}T09:00:00.000Z`
  };
}

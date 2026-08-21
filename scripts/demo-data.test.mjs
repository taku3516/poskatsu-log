import assert from "node:assert/strict";
import { DEMOGRAPHICS } from "../data/demographics.js";
import { INITIAL_APARTMENTS } from "../js/data.js";
import { DEMO_ACCOUNT_NAME, createDemoState } from "../js/demo-data.js";

const anchor = new Date("2026-08-21T09:00:00+09:00");
const state = createDemoState(anchor);
const dayKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const monthKey = (text) => text.slice(0, 7);

// 名前だけで見本と分かること（本番の台帳と取り違えない）
assert.ok(DEMO_ACCOUNT_NAME.includes("デモ"), "demo account name must be recognizable");

// 画面が埋まるだけの量があること
assert.ok(state.activities.length >= 15, `activities: ${state.activities.length}`);
assert.ok(state.materials.length >= 3, "multiple materials are needed for the breakdown chart");
assert.ok(state.workers.length >= 3, "multiple workers are needed for the worker chart");

const areaNames = new Set(DEMOGRAPHICS.map((item) => item.name));
const materialIds = new Set(state.materials.map((item) => item.id));

for (const activity of state.activities) {
  const materialTotal = activity.materials.reduce((sum, item) => sum + item.distributed, 0);
  const areaTotal = activity.areas.reduce((sum, item) => sum + item.distributed, 0);
  // アプリの入力検証（validateActivity）が警告を出さない形であること
  assert.equal(materialTotal, areaTotal, `${activity.id}: material total must match area total`);
  for (const material of activity.materials) {
    assert.ok(materialIds.has(material.materialId), `${activity.id}: unknown material`);
    assert.equal(material.taken - material.distributed, material.remaining, `${activity.id}: 持出-配布=残部`);
  }
  for (const area of activity.areas) {
    assert.ok(areaNames.has(area.area), `${activity.id}: unknown area ${area.area}`);
    assert.equal(area.apartmentCount + area.otherCount, area.distributed, `${activity.id}: ${area.area} の内訳`);
  }
  assert.match(activity.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(activity.date <= dayKey(anchor), `${activity.id}: 未来の日付は作らない`);
  assert.ok(activity.durationMinutes > 0, `${activity.id}: 活動時間`);
  assert.ok(activity.workers.length > 0, `${activity.id}: 担当者`);
}

// 同じ基準日なら毎回同じ結果（見本の説明が食い違わない）
assert.deepEqual(createDemoState(anchor), state, "demo data must be deterministic");

// 今月・過去数か月の両方に記録があること（ホームの今月／分析の推移グラフ）
const months = new Set(state.activities.map((activity) => monthKey(activity.date)));
assert.ok(state.activities.some((activity) => monthKey(activity.date) === monthKey(dayKey(anchor))), "今月の記録が要る");
assert.ok(months.size >= 5, `推移グラフ用に複数月が要る: ${months.size}`);

// 月間目標が今月に入っていて、達成途中に見えること
const goal = state.goals[monthKey(dayKey(anchor))];
const monthTotal = state.activities
  .filter((activity) => monthKey(activity.date) === monthKey(dayKey(anchor)))
  .reduce((sum, activity) => sum + activity.areas.reduce((inner, area) => inner + area.distributed, 0), 0);
assert.ok(goal > 0, "今月の目標");
assert.ok(monthTotal > 0 && monthTotal < goal, `進捗バーが途中に見えること: ${monthTotal}/${goal}`);

// 地図に濃淡が出ること（配布完了・配布中・未配布が同時に存在する）
const totals = new Map();
for (const activity of state.activities) {
  for (const area of activity.areas) totals.set(area.area, (totals.get(area.area) || 0) + area.distributed);
}
const rate = (name) => totals.get(name) / DEMOGRAPHICS.find((item) => item.name === name).households * 100;
const covered = [...totals.keys()];
assert.ok(covered.some((name) => rate(name) >= 80), "配布完了の町丁目");
assert.ok(covered.some((name) => rate(name) > 0 && rate(name) < 80), "配布中の町丁目");
assert.ok(DEMOGRAPHICS.length - covered.length >= 80, "未配布の町丁目が大半として残ること");
for (const name of covered) assert.ok(rate(name) <= 100, `${name}: 世帯数を超える配布は作らない (${rate(name).toFixed(1)}%)`);

// 最終配布からの経過日数にも幅があること（地図の「経過日数」表示）
const lastDates = new Map();
for (const activity of state.activities) {
  for (const area of activity.areas) {
    if (!lastDates.has(area.area) || activity.date > lastDates.get(area.area)) lastDates.set(area.area, activity.date);
  }
}
const elapsed = [...lastDates.values()].map((date) => Math.floor((anchor - new Date(`${date}T00:00:00`)) / 86400000));
assert.ok(elapsed.some((days) => days <= 30), "直近に回った町丁目");
assert.ok(elapsed.some((days) => days > 90), "しばらく回れていない町丁目");

// マンション地図: 3色そろい、未確認も残る
assert.equal(state.apartments.length, INITIAL_APARTMENTS.length, "同梱のマンション候補を土台にする");
const statuses = new Set(state.apartments.map((item) => item.postingStatus));
for (const status of ["allowed", "conditional", "prohibited", "unknown"]) {
  assert.ok(statuses.has(status), `マンションの配布可否 ${status}`);
}
assert.ok(state.apartments.some((item) => item.history.length > 0), "確認履歴");
const stale = state.apartments.filter((item) => item.checkedAt && (anchor - new Date(`${item.checkedAt}T00:00:00`)) / 86400000 > 90);
assert.ok(stale.length > 0, "ホームの「再確認したい物件」に出る古い確認日");
assert.ok(state.apartments.every((item) => !item.checkedAt || item.checkedAt <= dayKey(anchor)), "未来の確認日は作らない");

console.log(`demo data tests: ${state.activities.length} activities, ${months.size} months, ${covered.length} areas, ${state.apartments.length} apartments passed`);

import { store } from "./store.js";
import { firebaseAdapter } from "./firebase-adapter.js";
import { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF, DEMOGRAPHICS_SOURCE, TOWN_TOPOJSON_URL, BOUNDARY_CREDIT } from "./data.js";
import { createImportedActivityIdentity, csvEscape, escapeHtml } from "./security.js";

const yen = new Intl.NumberFormat("ja-JP");
const dateFormat = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" });
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = (prefix = "id") => `${prefix}-${crypto.randomUUID()}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
const arabicName = (name = "") => String(name).normalize("NFKC").replace(/[一二三四五六七八九十]+丁目/g, (match) => {
  const table = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const text = match.replace("丁目", "");
  const number = text === "十" ? 10 : text.startsWith("十") ? 10 + (table[text[1]] || 0) : text.endsWith("十") ? table[text[0]] * 10 : table[text] || text;
  return `${number}丁目`;
});

let activityMap;
let apartmentMap;
let townLayer;
let apartmentMarkers;
let townGeoJson = null;
let timerStarted = null;
let timerInterval = null;
let pendingImport = [];
let toastTimer;

function addCurrentLocationControl(map) {
  let locationMarker;
  let accuracyCircle;
  let button;

  const control = L.control({ position: "topright" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "leaflet-bar current-location-control");
    button = L.DomUtil.create("button", "current-location-button", container);
    button.type = "button";
    button.textContent = "◎ 現在地";
    button.title = "現在地を地図に表示";
    button.setAttribute("aria-label", "現在地を地図に表示");
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.DomEvent.on(button, "click", () => {
      button.disabled = true;
      button.textContent = "取得中…";
      button.setAttribute("aria-busy", "true");
      map._poskatsuLocationRequested = true;
      map.locate({ enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
    });
    return container;
  };
  control.addTo(map);

  map.on("locationfound", (event) => {
    if (accuracyCircle) accuracyCircle.remove();
    if (locationMarker) locationMarker.remove();
    accuracyCircle = L.circle(event.latlng, {
      radius: event.accuracy,
      color: "#1557a6",
      weight: 1,
      fillColor: "#4c86c5",
      fillOpacity: .12,
      interactive: false
    }).addTo(map);
    locationMarker = L.circleMarker(event.latlng, {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#1557a6",
      fillOpacity: 1
    }).bindTooltip("現在地").addTo(map);
    map.setView(event.latlng, Math.max(map.getZoom(), 16));
    button.disabled = false;
    button.textContent = "◎ 現在地";
    button.removeAttribute("aria-busy");
    button.setAttribute("aria-pressed", "true");
    toast("現在地を表示しました");
  });

  map.on("locationerror", (event) => {
    map._poskatsuLocationRequested = false;
    button.disabled = false;
    button.textContent = "◎ 現在地";
    button.removeAttribute("aria-busy");
    const messages = {
      1: "位置情報の利用が許可されていません。端末やブラウザの設定を確認してください。",
      2: "現在地を取得できませんでした。電波状況を確認して再度お試しください。",
      3: "現在地の取得がタイムアウトしました。再度お試しください。"
    };
    toast(messages[event.code] || "現在地を取得できませんでした。");
  });
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2800);
}

function minutesBetween(date, start, end) {
  if (!start || !end) return 0;
  const first = new Date(`${date}T${start}`);
  let last = new Date(`${date}T${end}`);
  if (last < first) last.setDate(last.getDate() + 1);
  return Math.max(0, Math.round((last - first) / 60000));
}

function activityTotal(activity) {
  return (activity.materials || []).reduce((sum, material) => sum + Number(material.distributed || 0), 0);
}

function activityMinutes(activity) {
  return Number(activity.durationMinutes || minutesBetween(activity.date, activity.startTime, activity.endTime));
}

function periodStart(period) {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(0);
}

function filterActivities(period = "all", materialId = "all") {
  const start = periodStart(period);
  return store.get().activities.filter((activity) => {
    const inPeriod = new Date(`${activity.date}T00:00:00`) >= start;
    const hasMaterial = materialId === "all" || activity.materials.some((item) => item.materialId === materialId);
    return inPeriod && hasMaterial;
  });
}

function materialName(id) {
  return store.get().materials.find((item) => item.id === id)?.name || "配布物";
}

function navigate(view) {
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === `view-${view}`));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  if (view === "map") setTimeout(renderActivityMap, 30);
  if (view === "apartments") setTimeout(renderApartmentMap, 30);
  if (view === "analysis") renderAnalysis();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function statCard(label, value, suffix = "") {
  return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}${suffix}</strong></article>`;
}

function renderHome() {
  $("#homeTitle").textContent = `${store.getActiveAccount().name}の今月の活動`;
  const activities = filterActivities("month");
  const total = activities.reduce((sum, activity) => sum + activityTotal(activity), 0);
  const minutes = activities.reduce((sum, activity) => sum + activityMinutes(activity), 0);
  const areas = new Set(activities.flatMap((activity) => activity.areas.map((area) => area.area)));
  $("#homeStats").innerHTML = [
    statCard("配布枚数", yen.format(total), "枚"),
    statCard("活動時間", (minutes / 60).toFixed(1), "時間"),
    statCard("活動回数", yen.format(activities.length), "回"),
    statCard("配布町丁目", yen.format(areas.size), "カ所")
  ].join("");
  const goal = store.get().goals[monthKey()] || 0;
  const rate = goal ? Math.min(100, total / goal * 100) : 0;
  $("#goalSummary").innerHTML = goal
    ? `<div class="progress-copy"><strong>${yen.format(total)} / ${yen.format(goal)}枚</strong><span>${rate.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-value" style="width:${rate}%"></div></div>`
    : '<p class="empty-state">目標はまだ設定されていません。</p>';
  const recent = [...store.get().activities].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)).slice(0, 3);
  $("#recentActivities").innerHTML = recent.length ? recent.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.date)}</strong><p>${escapeHtml(item.areas.map((area) => area.area).join("、") || "地域未入力")}</p></div><div class="list-value"><strong>${yen.format(activityTotal(item))}枚</strong><p>${(activityMinutes(item) / 60).toFixed(1)}時間</p></div></div>`).join("") : '<p class="empty-state">活動記録はまだありません。</p>';
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
  const attention = store.get().apartments.filter((item) => !item.checkedAt || new Date(item.checkedAt) < cutoff).sort((a, b) => b.units - a.units).slice(0, 4);
  $("#attentionList").innerHTML = attention.length ? attention.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.area)}・${item.checkedAt || "未確認"}</p></div><div class="list-value"><strong>${yen.format(item.units)}戸</strong></div></div>`).join("") : '<p class="empty-state">再確認対象はありません。</p>';
}

function renderSelectOptions() {
  const materialOptions = store.get().materials.filter((item) => item.active !== false).map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  ["#mapMaterial", "#analysisMaterial"].forEach((selector) => {
    const selected = $(selector).value;
    $(selector).innerHTML = `<option value="all">すべて</option>${materialOptions}`;
    if ([...$(selector).options].some((option) => option.value === selected)) $(selector).value = selected;
  });
  const areaOptions = DEMOGRAPHICS.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  ["#apartmentArea", "#apartmentTown"].forEach((selector) => {
    const first = selector === "#apartmentArea" ? '<option value="all">すべて</option>' : "";
    $(selector).innerHTML = first + areaOptions;
  });
}

function addMaterialRow(value = {}) {
  const row = document.createElement("div");
  row.className = "repeat-row material-repeat-row";
  row.innerHTML = `<label>配布物<select data-field="materialId">${store.get().materials.filter((item) => item.active !== false).map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></label><label>持出<input data-field="taken" type="number" min="0" value="${Number(value.taken || 0)}"></label><label>配布<input data-field="distributed" type="number" min="0" value="${Number(value.distributed || 0)}"></label><label>残部<input data-field="remaining" type="number" min="0" value="${Number(value.remaining || 0)}"></label><label>差異理由<input data-field="varianceReason" value="${escapeHtml(value.varianceReason || "")}" placeholder="不一致時"></label><button class="icon-button" data-remove-row type="button" aria-label="行を削除">×</button>`;
  if (value.materialId) $("[data-field='materialId']", row).value = value.materialId;
  $("#materialRows").append(row);
}

function addAreaRow(value = {}) {
  const row = document.createElement("div");
  row.className = "repeat-row area-repeat-row";
  row.innerHTML = `<label>町丁目<select data-field="area">${DEMOGRAPHICS.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("")}</select></label><label>配布枚数<input data-field="distributed" type="number" min="0" value="${Number(value.distributed || 0)}"></label><label>マンション<input data-field="apartmentCount" type="number" min="0" value="${Number(value.apartmentCount || 0)}"></label><label>戸建て等<input data-field="otherCount" type="number" min="0" value="${Number(value.otherCount || 0)}"></label><button class="icon-button" data-remove-row type="button" aria-label="行を削除">×</button>`;
  if (value.area) $("[data-field='area']", row).value = value.area;
  $("#areaRows").append(row);
}

function resetActivityForm() {
  $("#activityForm").reset();
  $("#activityId").value = "";
  $("#activityDate").value = today();
  $("#peopleCount").value = 1;
  $("#materialRows").innerHTML = "";
  $("#areaRows").innerHTML = "";
  addMaterialRow();
  addAreaRow();
  $("#activityWarnings").hidden = true;
}

function collectRows(container, fields) {
  return $$(".repeat-row", $(container)).map((row) => Object.fromEntries(fields.map((field) => [field, $(`[data-field='${field}']`, row).value])));
}

function collectActivity() {
  const materials = collectRows("#materialRows", ["materialId", "taken", "distributed", "remaining", "varianceReason"]).map((item) => ({ ...item, taken: Number(item.taken), distributed: Number(item.distributed), remaining: Number(item.remaining) }));
  const areas = collectRows("#areaRows", ["area", "distributed", "apartmentCount", "otherCount"]).map((item) => ({ ...item, distributed: Number(item.distributed), apartmentCount: Number(item.apartmentCount), otherCount: Number(item.otherCount) }));
  const date = $("#activityDate").value;
  return {
    id: $("#activityId").value || uid("activity"), date,
    startTime: $("#startTime").value, endTime: $("#endTime").value,
    durationMinutes: minutesBetween(date, $("#startTime").value, $("#endTime").value),
    peopleCount: Number($("#peopleCount").value || 1),
    workers: $("#workers").value.split(/[、,]/).map((value) => value.trim()).filter(Boolean),
    memo: $("#activityMemo").value.trim(), materials, areas,
    inputMethod: timerStarted ? "timer" : "manual",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

function validateActivity(activity) {
  const warnings = [];
  activity.materials.forEach((item) => {
    if (item.taken - item.distributed !== item.remaining && !item.varianceReason) warnings.push(`${materialName(item.materialId)}の持出・配布・残部が一致しません。差異理由を入力してください。`);
  });
  const materialTotal = activity.materials.reduce((sum, item) => sum + item.distributed, 0);
  const areaTotal = activity.areas.reduce((sum, item) => sum + item.distributed, 0);
  if (materialTotal !== areaTotal) warnings.push(`配布物合計${yen.format(materialTotal)}枚と町丁目内訳${yen.format(areaTotal)}枚が一致しません。`);
  activity.areas.forEach((item) => {
    if (item.apartmentCount + item.otherCount > 0 && item.apartmentCount + item.otherCount !== item.distributed) warnings.push(`${item.area}のマンション・戸建て等の内訳が配布枚数と一致しません。`);
  });
  return warnings;
}

function saveActivity(event) {
  event.preventDefault();
  const activity = collectActivity();
  const warnings = validateActivity(activity);
  if (warnings.length && !confirm(`${warnings.join("\n")}\n\nこの内容で保存しますか？`)) {
    $("#activityWarnings").hidden = false;
    $("#activityWarnings").innerHTML = warnings.map(escapeHtml).join("<br>");
    return;
  }
  store.saveActivity(activity);
  stopTimer(false);
  resetActivityForm();
  toast("活動を保存しました");
  navigate("history");
}

function editActivity(id) {
  const activity = store.get().activities.find((item) => item.id === id);
  if (!activity) return;
  resetActivityForm();
  $("#activityId").value = activity.id;
  $("#activityDate").value = activity.date;
  $("#startTime").value = activity.startTime;
  $("#endTime").value = activity.endTime;
  $("#peopleCount").value = activity.peopleCount;
  $("#workers").value = activity.workers.join("、");
  $("#activityMemo").value = activity.memo || "";
  $("#materialRows").innerHTML = ""; activity.materials.forEach(addMaterialRow);
  $("#areaRows").innerHTML = ""; activity.areas.forEach(addAreaRow);
  navigate("record");
}

function startTimer() {
  timerStarted = new Date();
  $("#activityDate").value = today();
  $("#startTime").value = timerStarted.toTimeString().slice(0, 5);
  $("#timerToggle").textContent = "終了";
  $("#timerStatus").textContent = "計測中";
  $("#timerStartedAt").textContent = `${$("#startTime").value}に開始`;
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  const seconds = Math.floor((Date.now() - timerStarted) / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor(seconds % 3600 / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  $("#timerDisplay").textContent = `${h}:${m}:${s}`;
}

function stopTimer(setEnd = true) {
  if (!timerStarted) return;
  if (setEnd) $("#endTime").value = new Date().toTimeString().slice(0, 5);
  clearInterval(timerInterval); timerInterval = null; timerStarted = null;
  $("#timerToggle").textContent = "開始"; $("#timerStatus").textContent = "停止中"; $("#timerDisplay").textContent = "00:00:00"; $("#timerStartedAt").textContent = "開始ボタンを押すと計測します";
}

function renderHistory() {
  const search = $("#historySearch").value.toLowerCase();
  const items = filterActivities($("#historyPeriod").value).filter((activity) => JSON.stringify(activity).toLowerCase().includes(search)).sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
  $("#historyList").innerHTML = items.length ? items.map((activity) => `<article class="activity-card"><div class="activity-card-header"><div><h3>${escapeHtml(dateFormat.format(new Date(`${activity.date}T00:00:00`)))}</h3><div class="meta-row"><span>${escapeHtml(activity.startTime)}〜${escapeHtml(activity.endTime)}</span><span>${(activityMinutes(activity) / 60).toFixed(1)}時間</span><span>${activity.peopleCount}人</span></div></div><strong>${yen.format(activityTotal(activity))}枚</strong></div><p>${escapeHtml(activity.areas.map((item) => item.area).join("、"))}</p><div class="meta-row"><span>${escapeHtml(activity.materials.map((item) => materialName(item.materialId)).join("、"))}</span></div><div class="button-row"><button class="button button-small" data-share-activity="${escapeHtml(activity.id)}" type="button">共有</button><button class="button button-small" data-edit-activity="${escapeHtml(activity.id)}" type="button">編集</button><button class="button button-small" data-delete-activity="${escapeHtml(activity.id)}" type="button">削除</button></div></article>`).join("") : '<p class="panel empty-state">条件に合う活動記録はありません。</p>';
}

function decodeArc(topology, arcIndex) {
  const index = arcIndex < 0 ? ~arcIndex : arcIndex;
  let points;
  if (topology.transform) {
    let x = 0; let y = 0;
    points = topology.arcs[index].map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * topology.transform.scale[0] + topology.transform.translate[0], y * topology.transform.scale[1] + topology.transform.translate[1]];
    });
  } else {
    points = topology.arcs[index].map(([longitude, latitude]) => [longitude, latitude]);
  }
  return arcIndex < 0 ? points.reverse() : points;
}

function stitchRing(topology, indexes) {
  const ring = [];
  indexes.forEach((index, position) => {
    const arc = decodeArc(topology, index);
    ring.push(...(position ? arc.slice(1) : arc));
  });
  return ring;
}

function topologyToGeoJson(topology) {
  const object = topology.objects.town || Object.values(topology.objects)[0];
  return {
    type: "FeatureCollection",
    features: object.geometries.filter((geometry) => geometry.properties?.S_NAME).map((geometry) => {
      const coordinates = geometry.type === "Polygon"
        ? geometry.arcs.map((ring) => stitchRing(topology, ring))
        : geometry.arcs.map((polygon) => polygon.map((ring) => stitchRing(topology, ring)));
      return { type: "Feature", properties: geometry.properties, geometry: { type: geometry.type, coordinates } };
    })
  };
}

async function loadTownGeometry() {
  if (townGeoJson) return townGeoJson;
  try {
    const response = await fetch(TOWN_TOPOJSON_URL);
    if (!response.ok) throw new Error(`境界データ ${response.status}`);
    townGeoJson = topologyToGeoJson(await response.json());
    return townGeoJson;
  } catch (error) {
    console.error(error);
    toast("町丁目境界を取得できませんでした。一覧情報は利用できます。");
    return null;
  }
}

function normalizedFeatureName(feature) {
  return arabicName(feature.properties.S_NAME || "");
}

function areaMetrics(activities, materialId) {
  const result = new Map();
  activities.forEach((activity) => activity.areas.forEach((area) => {
    let ratio = 1;
    if (materialId !== "all") {
      const selected = activity.materials.find((item) => item.materialId === materialId)?.distributed || 0;
      const total = activityTotal(activity);
      ratio = total ? selected / total : 0;
    }
    const current = result.get(area.area) || { total: 0, lastDate: "" };
    current.total += Math.round(area.distributed * ratio);
    if (activity.date > current.lastDate) current.lastDate = activity.date;
    result.set(area.area, current);
  }));
  return result;
}

function metricForArea(name) {
  const metric = $("#mapMetric").value;
  const activities = filterActivities($("#mapPeriod").value, $("#mapMaterial").value);
  const result = areaMetrics(activities, $("#mapMaterial").value).get(name) || { total: 0, lastDate: "" };
  const demographic = DEMOGRAPHICS.find((item) => item.name === name);
  const rate = demographic?.households ? result.total / demographic.households * 100 : 0;
  const days = result.lastDate ? Math.floor((Date.now() - new Date(`${result.lastDate}T00:00:00`)) / 86400000) : null;
  return { ...result, rate, days, demographic, metric };
}

function mapColor(value) {
  const metric = value.metric;
  if (metric === "base") return "#dbe9f8";
  if (metric === "status") return value.total === 0 ? "#e5e7eb" : value.rate >= 80 ? "#257a4f" : "#f0b44d";
  const number = metric === "rate" ? value.rate : metric === "days" ? (value.days === null ? 999 : value.days) : value.total;
  if (metric === "days") return number > 90 ? "#d65f4a" : number > 30 ? "#f0b44d" : "#4a83c1";
  if (number <= 0) return "#edf1f5";
  if (metric === "rate") return number >= 80 ? "#1557a6" : number >= 40 ? "#4c86c5" : "#a8c7e8";
  return number >= 2000 ? "#1557a6" : number >= 500 ? "#4c86c5" : "#a8c7e8";
}

function renderMapDetail(name) {
  const value = metricForArea(name);
  const demographic = value.demographic;
  if (!demographic) return;
  const status = value.total === 0 ? "未配布" : value.rate >= 80 ? "配布完了" : "配布中";
  $("#mapDetail").innerHTML = `<h3>${escapeHtml(name)}</h3><div class="list-row"><span>総人口</span><strong>${yen.format(demographic.population)}人</strong></div><div class="list-row"><span>世帯数</span><strong>${yen.format(demographic.households)}世帯</strong></div><div class="list-row"><span>男性／女性</span><strong>${yen.format(demographic.male)}／${yen.format(demographic.female)}人</strong></div><div class="list-row"><span>配布枚数</span><strong>${yen.format(value.total)}枚</strong></div><div class="list-row"><span>世帯比</span><strong>${value.rate.toFixed(1)}%</strong></div><div class="list-row"><span>進捗</span><strong>${status}</strong></div><div class="list-row"><span>最終配布</span><strong>${value.lastDate || "記録なし"}</strong></div><h3 style="margin-top:18px">年齢区分</h3>${demographic.ageGroups.map((group) => `<div class="list-row"><span>${escapeHtml(group.label)}</span><strong>${yen.format(group.value)}人</strong></div>`).join("")}<p class="source-note">基準日 ${DEMOGRAPHICS_AS_OF}<br><a href="${DEMOGRAPHICS_SOURCE}" target="_blank" rel="noopener">品川区の統計を確認</a></p>`;
}

async function renderActivityMap() {
  if (!window.L) return;
  if (!activityMap) {
    activityMap = L.map("activityMap", { zoomControl: true }).setView([35.609, 139.73], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(activityMap);
    addCurrentLocationControl(activityMap);
  }
  activityMap.invalidateSize();
  if (townLayer) townLayer.remove();
  const geoJson = await loadTownGeometry();
  if (!geoJson) return;
  townLayer = L.geoJSON(geoJson, {
    style: (feature) => ({ color: "#4f6f95", weight: 1, fillColor: mapColor(metricForArea(normalizedFeatureName(feature))), fillOpacity: .7 }),
    onEachFeature: (feature, layer) => {
      const name = normalizedFeatureName(feature);
      layer.bindTooltip(name, { sticky: true });
      layer.on("click", () => renderMapDetail(name));
    }
  }).addTo(activityMap);
  if (!activityMap._poskatsuLocationRequested) activityMap.fitBounds(townLayer.getBounds(), { padding: [8, 8] });
}

const POSTING_LABELS = { allowed: "配布可", conditional: "条件付き", prohibited: "配布禁止", unknown: "未確認" };

function renderApartments() {
  const area = $("#apartmentArea").value;
  const status = $("#apartmentStatus").value;
  const units = Number($("#apartmentUnits").value || 0);
  const sort = $("#apartmentSort").value;
  const items = store.get().apartments.filter((item) => (area === "all" || item.area === area) && (status === "all" || item.postingStatus === status) && item.units >= units);
  items.sort(sort === "area" ? (a, b) => a.area.localeCompare(b.area, "ja") : sort === "old" ? (a, b) => (a.checkedAt || "").localeCompare(b.checkedAt || "") : (a, b) => b.units - a.units);
  $("#apartmentList").innerHTML = items.length ? items.map((item) => `<article class="apartment-card"><div class="apartment-card-header"><div><h3>${escapeHtml(item.name)}</h3><div class="meta-row"><span>${escapeHtml(item.area)}</span><span>${yen.format(item.units)}戸</span></div></div><strong class="posting-${item.postingStatus}">${POSTING_LABELS[item.postingStatus]}</strong></div><p>${escapeHtml(item.reason || item.address || "詳細未入力")}</p><div class="meta-row"><span>確認日 ${item.checkedAt || "未確認"}</span><span>${item.confidence === "verified" ? "確認済み" : item.confidence === "review" ? "要再確認" : "候補"}</span></div><button class="button button-small" data-edit-apartment="${item.id}" type="button">詳細・編集</button></article>`).join("") : '<p class="panel empty-state">条件に合うマンションはありません。</p>';
}

function postingMarkerColor(status) {
  return status === "allowed" ? "#16794a" : status === "prohibited" ? "#b42318" : status === "conditional" ? "#9a6700" : "#667085";
}

function renderApartmentMap() {
  if (!window.L) return;
  if (!apartmentMap) {
    apartmentMap = L.map("apartmentMap").setView([35.609, 139.73], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(apartmentMap);
    addCurrentLocationControl(apartmentMap);
    apartmentMarkers = L.layerGroup().addTo(apartmentMap);
  }
  apartmentMap.invalidateSize(); apartmentMarkers.clearLayers();
  store.get().apartments.filter((item) => item.lat && item.lng && item.units >= Number($("#apartmentUnits").value || 0)).forEach((item) => {
    const marker = L.circleMarker([item.lat, item.lng], { radius: Math.min(14, 6 + item.units / 60), color: postingMarkerColor(item.postingStatus), fillColor: postingMarkerColor(item.postingStatus), fillOpacity: .8 });
    marker.bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${yen.format(item.units)}戸<br>${POSTING_LABELS[item.postingStatus]}`).on("click", () => openApartmentDialog(item.id));
    marker.addTo(apartmentMarkers);
  });
}

function openApartmentDialog(id = "") {
  const item = store.get().apartments.find((apartment) => apartment.id === id) || {};
  $("#apartmentForm").reset();
  $("#apartmentId").value = item.id || ""; $("#apartmentName").value = item.name || ""; $("#apartmentUnitCount").value = item.units || ""; $("#apartmentTown").value = item.area || DEMOGRAPHICS[0].name; $("#apartmentPostingStatus").value = item.postingStatus || "unknown"; $("#apartmentLat").value = item.lat || ""; $("#apartmentLng").value = item.lng || ""; $("#apartmentCheckedAt").value = item.checkedAt || ""; $("#apartmentConfidence").value = item.confidence || "candidate"; $("#apartmentAddress").value = item.address || ""; $("#apartmentReason").value = item.reason || ""; $("#apartmentMemo").value = item.memo || ""; $("#apartmentSource").value = item.sourceUrl || "";
  $("#deleteApartment").hidden = !item.id;
  $("#apartmentDialog").showModal();
}

function saveApartment(event) {
  event.preventDefault();
  const previous = store.get().apartments.find((item) => item.id === $("#apartmentId").value);
  const nextStatus = $("#apartmentPostingStatus").value;
  const history = structuredClone(previous?.history || []);
  if (previous && (previous.postingStatus !== nextStatus || previous.checkedAt !== $("#apartmentCheckedAt").value)) history.unshift({ date: $("#apartmentCheckedAt").value || today(), from: previous.postingStatus, to: nextStatus, reason: $("#apartmentReason").value, createdAt: new Date().toISOString() });
  store.saveApartment({ id: previous?.id || uid("apartment"), name: $("#apartmentName").value.trim(), units: Number($("#apartmentUnitCount").value), area: $("#apartmentTown").value, postingStatus: nextStatus, lat: Number($("#apartmentLat").value) || null, lng: Number($("#apartmentLng").value) || null, checkedAt: $("#apartmentCheckedAt").value, confidence: $("#apartmentConfidence").value, address: $("#apartmentAddress").value.trim(), reason: $("#apartmentReason").value.trim(), memo: $("#apartmentMemo").value.trim(), sourceUrl: $("#apartmentSource").value.trim(), history, updatedAt: new Date().toISOString() });
  $("#apartmentDialog").close(); toast("マンション情報を保存しました");
}

function analysisData() {
  const activities = filterActivities($("#analysisPeriod").value, $("#analysisMaterial").value);
  const materialId = $("#analysisMaterial").value;
  const getTotal = (activity) => materialId === "all" ? activityTotal(activity) : activity.materials.find((item) => item.materialId === materialId)?.distributed || 0;
  return { activities, getTotal, total: activities.reduce((sum, activity) => sum + getTotal(activity), 0), minutes: activities.reduce((sum, activity) => sum + activityMinutes(activity), 0) };
}

function rankingRows(entries) {
  const max = entries[0]?.[1] || 1;
  return entries.length ? entries.map(([name, value]) => `<div class="ranking-row"><span>${escapeHtml(name)}</span><div class="mini-track"><div class="mini-value" style="width:${value / max * 100}%"></div></div><strong>${yen.format(value)}枚</strong></div>`).join("") : '<p class="empty-state">記録がありません。</p>';
}

function renderAnalysis() {
  const { activities, getTotal, total, minutes } = analysisData();
  const areas = new Set(activities.flatMap((activity) => activity.areas.map((item) => item.area)));
  $("#analysisStats").innerHTML = [statCard("配布枚数", yen.format(total), "枚"), statCard("活動時間", (minutes / 60).toFixed(1), "時間"), statCard("活動回数", yen.format(activities.length), "回"), statCard("1時間あたり", minutes ? yen.format(Math.round(total / minutes * 60)) : "0", "枚"), statCard("配布町丁目", yen.format(areas.size), "カ所")].join("");
  const trend = new Map(); activities.forEach((activity) => { const key = activity.date.slice(0, 7); trend.set(key, (trend.get(key) || 0) + getTotal(activity)); });
  const trendEntries = [...trend.entries()].sort(); const trendMax = Math.max(1, ...trendEntries.map(([, value]) => value));
  $("#trendChart").innerHTML = trendEntries.length ? trendEntries.map(([label, value]) => `<div class="bar-column"><strong>${yen.format(value)}</strong><div class="bar" style="height:${Math.max(2, value / trendMax * 190)}px"></div><small>${escapeHtml(label)}</small></div>`).join("") : '<p class="empty-state">記録がありません。</p>';
  const areaTotals = new Map(); activities.forEach((activity) => activity.areas.forEach((area) => areaTotals.set(area.area, (areaTotals.get(area.area) || 0) + area.distributed)));
  $("#areaRanking").innerHTML = rankingRows([...areaTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5));
  const materialTotals = new Map(); activities.forEach((activity) => activity.materials.forEach((item) => materialTotals.set(materialName(item.materialId), (materialTotals.get(materialName(item.materialId)) || 0) + item.distributed)));
  $("#materialBreakdown").innerHTML = rankingRows([...materialTotals.entries()].sort((a, b) => b[1] - a[1]));
  const workerTotals = new Map(); activities.forEach((activity) => (activity.workers.length ? activity.workers : ["未指定"]).forEach((worker) => workerTotals.set(worker, (workerTotals.get(worker) || 0) + Math.round(getTotal(activity) / Math.max(activity.workers.length, 1)))));
  $("#workerBreakdown").innerHTML = rankingRows([...workerTotals.entries()].sort((a, b) => b[1] - a[1]));
}

function activityShareText(activity) {
  const total = activityTotal(activity); const minutes = activityMinutes(activity);
  return [`【ポスティング活動記録】`, `日付：${activity.date}`, `時間：${activity.startTime}～${activity.endTime}（${(minutes / 60).toFixed(1)}時間）`, `地域：${activity.areas.map((item) => item.area).join("、")}`, `配布物：${activity.materials.map((item) => `${materialName(item.materialId)} ${yen.format(item.distributed)}枚`).join("、")}`, `配布枚数：${yen.format(total)}枚`, `参加人数：${activity.peopleCount}人`, `1時間あたり：${minutes ? yen.format(Math.round(total / minutes * 60)) : 0}枚`].join("\n");
}

async function shareText(text, title = "ポス活ログ") {
  const edited = prompt("共有する文面を確認・編集してください。", text);
  if (edited === null) return;
  try {
    if (navigator.share) await navigator.share({ title, text: edited });
    else { await navigator.clipboard.writeText(edited); toast("共有文をコピーしました"); }
  } catch (error) { if (error.name !== "AbortError") { await navigator.clipboard.writeText(edited); toast("共有文をコピーしました"); } }
}

function analysisShareText() {
  const { activities, total, minutes } = analysisData();
  const areas = new Set(activities.flatMap((activity) => activity.areas.map((item) => item.area)));
  return [`【ポス活ログ 活動レポート】`, `対象：${$("#analysisPeriod").selectedOptions[0].textContent}`, `配布枚数：${yen.format(total)}枚`, `活動時間：${(minutes / 60).toFixed(1)}時間`, `活動回数：${activities.length}回`, `1時間あたり：${minutes ? yen.format(Math.round(total / minutes * 60)) : 0}枚`, `配布町丁目：${areas.size}カ所`].join("\n");
}

function createReportCanvas() {
  const { activities, total, minutes } = analysisData();
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
  const context = canvas.getContext("2d"); context.fillStyle = "#f4f6f9"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1557a6"; context.fillRect(0, 0, canvas.width, 170);
  context.fillStyle = "#fff"; context.font = "700 52px sans-serif"; context.fillText("ポス活ログ 活動レポート", 70, 90); context.font = "28px sans-serif"; context.fillText($("#analysisPeriod").selectedOptions[0].textContent, 70, 136);
  const cards = [["配布枚数", `${yen.format(total)}枚`], ["活動時間", `${(minutes / 60).toFixed(1)}時間`], ["活動回数", `${activities.length}回`], ["1時間あたり", `${minutes ? yen.format(Math.round(total / minutes * 60)) : 0}枚`]];
  cards.forEach(([label, value], index) => { const x = 60 + index % 2 * 500; const y = 220 + Math.floor(index / 2) * 180; context.fillStyle = "#fff"; context.fillRect(x, y, 460, 145); context.fillStyle = "#667085"; context.font = "26px sans-serif"; context.fillText(label, x + 30, y + 45); context.fillStyle = "#172033"; context.font = "700 48px sans-serif"; context.fillText(value, x + 30, y + 110); });
  const areaTotals = new Map(); activities.forEach((activity) => activity.areas.forEach((area) => areaTotals.set(area.area, (areaTotals.get(area.area) || 0) + area.distributed)));
  const entries = [...areaTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5); const max = entries[0]?.[1] || 1;
  context.fillStyle = "#172033"; context.font = "700 36px sans-serif"; context.fillText("町丁目別 上位5件", 70, 650);
  entries.forEach(([name, value], index) => { const y = 710 + index * 105; context.fillStyle = "#344054"; context.font = "28px sans-serif"; context.fillText(name, 70, y); context.fillStyle = "#e3e9f1"; context.fillRect(300, y - 28, 560, 34); context.fillStyle = "#1557a6"; context.fillRect(300, y - 28, 560 * value / max, 34); context.fillStyle = "#172033"; context.font = "700 26px sans-serif"; context.fillText(`${yen.format(value)}枚`, 880, y); });
  context.fillStyle = "#667085"; context.font = "24px sans-serif"; context.fillText("個人名・肩書・政党名・マンション情報は含まれていません", 70, 1290);
  return canvas;
}

async function shareAnalysisImage() {
  const canvas = createReportCanvas();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], `poskatsu-report-${today()}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "ポス活ログ 活動レポート" }); return; } catch (error) { if (error.name === "AbortError") return; }
  }
  const link = document.createElement("a"); link.download = file.name; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href); toast("レポート画像を保存しました");
}

function downloadCsv(name, headers, rows) {
  const body = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", body], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a"); link.download = name; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
}

function exportActivities() {
  const rows = store.get().activities.flatMap((activity) => activity.areas.map((area) => [activity.id, activity.date, activity.startTime, activity.endTime, activityMinutes(activity), activity.peopleCount, activity.workers.join("、"), activity.materials.map((item) => materialName(item.materialId)).join("、"), activityTotal(activity), area.area, area.distributed, area.apartmentCount, area.otherCount, activity.memo]));
  downloadCsv("活動記録.csv", ["活動ID", "活動日", "開始時刻", "終了時刻", "活動時間分", "参加人数", "担当者", "配布物", "活動配布枚数", "町丁目", "町丁目配布枚数", "マンション", "戸建て等", "メモ"], rows);
}

function exportApartments() {
  downloadCsv("マンション情報.csv", ["物件ID", "物件名", "住所", "町丁目", "総戸数", "配布可否", "条件・禁止理由", "最終確認日", "情報の確度", "メモ", "参照元URL"], store.get().apartments.map((item) => [item.id, item.name, item.address, item.area, item.units, POSTING_LABELS[item.postingStatus], item.reason, item.checkedAt, item.confidence, item.memo, item.sourceUrl]));
}

function exportMaterials() {
  downloadCsv("配布物マスター.csv", ["配布物ID", "配布物名", "表示状態"], store.get().materials.map((item) => [item.id, item.name, item.active === false ? "非表示" : "表示"]));
}

function exportWorkers() {
  downloadCsv("担当者マスター.csv", ["担当者名"], store.get().workers.map((name) => [name]));
}

function exportApartmentHistory() {
  const rows = store.get().apartments.flatMap((item) => (item.history || []).map((history) => [item.id, item.name, history.date, POSTING_LABELS[history.from] || history.from, POSTING_LABELS[history.to] || history.to, history.reason, history.createdAt]));
  downloadCsv("マンション確認履歴.csv", ["物件ID", "物件名", "確認日", "変更前", "変更後", "理由", "記録日時"], rows);
}

function exportAllCsv() {
  const exports = [exportActivities, exportApartments, exportMaterials, exportWorkers, exportApartmentHistory];
  exports.forEach((run, index) => setTimeout(run, index * 300));
}

function parseCsvLine(line) {
  const result = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) { const char = line[i]; if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; } else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { result.push(value); value = ""; } else value += char; }
  result.push(value); return result;
}

function detectColumn(headers, patterns) { return headers.findIndex((header) => patterns.some((pattern) => header.includes(pattern))); }

async function previewCsv(file) {
  const text = await file.text();
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter(Boolean); const headers = parseCsvLine(lines[0]); const rows = lines.slice(1).map(parseCsvLine);
  const columns = { date: detectColumn(headers, ["活動日", "日付"]), startTime: detectColumn(headers, ["開始"]), endTime: detectColumn(headers, ["終了"]), peopleCount: detectColumn(headers, ["参加人数", "人数"]), workers: detectColumn(headers, ["担当者"]), material: detectColumn(headers, ["配布物"]), total: detectColumn(headers, ["町丁目配布枚数", "配布枚数"]), area: detectColumn(headers, ["町丁目", "地域"]), memo: detectColumn(headers, ["メモ"]), sourceId: detectColumn(headers, ["活動ID", "ID"]) };
  const missing = ["date", "total", "area"].filter((key) => columns[key] < 0);
  pendingImport = missing.length ? [] : rows.map((row) => {
    const materialNameRaw = row[columns.material] || "インポート配布物";
    const existingMaterial = store.get().materials.find((item) => item.name === materialNameRaw);
    const identity = createImportedActivityIdentity(columns.sourceId >= 0 ? row[columns.sourceId] : "", uid);
    return { ...identity, date: row[columns.date], startTime: row[columns.startTime] || "00:00", endTime: row[columns.endTime] || "00:00", durationMinutes: minutesBetween(row[columns.date], row[columns.startTime], row[columns.endTime]), peopleCount: Number(row[columns.peopleCount] || 1), workers: String(row[columns.workers] || "").split(/[、,]/).filter(Boolean), memo: row[columns.memo] || "", materials: [{ materialId: existingMaterial?.id || "", materialNameRaw, taken: Number(row[columns.total] || 0), distributed: Number(row[columns.total] || 0), remaining: 0, varianceReason: "" }], areas: [{ area: arabicName(row[columns.area]), distributed: Number(row[columns.total] || 0), apartmentCount: 0, otherCount: 0 }], inputMethod: "csv", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  });
  $("#importPreview").innerHTML = missing.length ? `<div class="notice warning">必須列を判定できません：${missing.join("、")}。ポス活ログ標準CSVまたは列名を調整してください。</div>` : `<p><strong>${pendingImport.length}件</strong>を検出しました。先頭5件を確認してください。</p><div class="compact-list">${pendingImport.slice(0, 5).map((item) => `<div class="list-row"><span>${escapeHtml(item.date)} ${escapeHtml(item.areas[0].area)}</span><strong>${yen.format(activityTotal(item))}枚</strong></div>`).join("")}</div>`;
  $("#confirmImport").hidden = !pendingImport.length;
}

function findOrCreateMaterial(name) {
  const existing = store.get().materials.find((item) => item.name === name);
  if (existing) return existing.id;
  const material = { id: uid("material"), name, active: true }; store.saveMaterial(material); return material.id;
}

function confirmImport() {
  let saved = 0; let duplicates = 0;
  pendingImport.forEach((item) => {
    if (store.get().activities.some((existing) => (item.sourceId && (existing.id === item.sourceId || existing.sourceId === item.sourceId)) || (existing.date === item.date && existing.startTime === item.startTime && activityTotal(existing) === activityTotal(item)))) { duplicates += 1; return; }
    item.materials = item.materials.map(({ materialNameRaw, ...material }) => ({ ...material, materialId: material.materialId || findOrCreateMaterial(materialNameRaw) }));
    store.saveActivity(item); saved += 1;
  });
  pendingImport = []; $("#confirmImport").hidden = true; $("#importPreview").innerHTML = `<p>${saved}件を登録し、重複候補${duplicates}件をスキップしました。</p>`; toast("CSVの取り込みが完了しました");
}

function renderSettings() {
  $("#monthlyGoal").value = store.get().goals[monthKey()] || "";
  $("#materialMaster").innerHTML = store.get().materials.map((item) => `<div class="list-row"><span>${escapeHtml(item.name)}</span><button class="text-button" data-toggle-material="${escapeHtml(item.id)}" type="button">${item.active === false ? "表示する" : "非表示"}</button></div>`).join("");
  const accounts = store.getAccounts();
  const activeId = store.getActiveAccount().id;
  $("#accountSwitcher").innerHTML = accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join("");
  $("#accountSwitcher").value = activeId;
  $("#accountList").innerHTML = accounts.map((account) => `<div class="account-row"><input value="${escapeHtml(account.name)}" maxlength="60" aria-label="${escapeHtml(account.name)}の名称" data-account-name="${escapeHtml(account.id)}"><button class="button button-small" data-rename-account="${escapeHtml(account.id)}" type="button">名称変更</button><button class="button button-small button-danger" data-delete-account="${escapeHtml(account.id)}" type="button" ${accounts.length === 1 ? "disabled" : ""}>削除</button>${account.id === activeId ? '<span class="account-row-current">現在使用中</span>' : ""}</div>`).join("");
}

function renderAll() {
  renderSelectOptions(); renderHome(); renderHistory(); renderApartments(); renderAnalysis(); renderSettings();
  if ($("#view-map").classList.contains("active")) renderActivityMap();
  if ($("#view-apartments").classList.contains("active")) renderApartmentMap();
}

function bindEvents() {
  $$("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  $$("[data-view-jump]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.viewJump)));
  $$("[data-open-record]").forEach((button) => button.addEventListener("click", () => navigate("record")));
  $$("[data-open-import]").forEach((button) => button.addEventListener("click", () => { navigate("settings"); $("#csvSection").scrollIntoView({ behavior: "smooth" }); }));
  $("#quickStartButton").addEventListener("click", () => { navigate("record"); if (!timerStarted) startTimer(); });
  $("#timerToggle").addEventListener("click", () => timerStarted ? stopTimer() : startTimer());
  $("#activityForm").addEventListener("submit", saveActivity); $("#resetActivity").addEventListener("click", resetActivityForm);
  $("#addMaterialRow").addEventListener("click", () => addMaterialRow()); $("#addAreaRow").addEventListener("click", () => addAreaRow());
  document.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-row]"); if (remove) remove.closest(".repeat-row").remove();
    const edit = event.target.closest("[data-edit-activity]"); if (edit) editActivity(edit.dataset.editActivity);
    const share = event.target.closest("[data-share-activity]"); if (share) { const item = store.get().activities.find((activity) => activity.id === share.dataset.shareActivity); if (item) shareText(activityShareText(item)); }
    const deletion = event.target.closest("[data-delete-activity]"); if (deletion && confirm("この活動記録を削除しますか？")) store.deleteActivity(deletion.dataset.deleteActivity);
    const editApartmentButton = event.target.closest("[data-edit-apartment]"); if (editApartmentButton) openApartmentDialog(editApartmentButton.dataset.editApartment);
    const toggle = event.target.closest("[data-toggle-material]"); if (toggle) { const item = store.get().materials.find((material) => material.id === toggle.dataset.toggleMaterial); store.saveMaterial({ ...item, active: item.active === false }); }
    const renameAccount = event.target.closest("[data-rename-account]");
    if (renameAccount) {
      const input = $(`[data-account-name="${CSS.escape(renameAccount.dataset.renameAccount)}"]`);
      try { store.renameAccount(renameAccount.dataset.renameAccount, input.value); toast("活動アカウント名を変更しました"); } catch (error) { alert(error.message); }
    }
    const deleteAccount = event.target.closest("[data-delete-account]");
    if (deleteAccount) {
      const account = store.getAccounts().find((item) => item.id === deleteAccount.dataset.deleteAccount);
      const confirmation = prompt(`「${account.name}」と、その中の活動記録をすべて削除します。\n削除するには活動アカウント名を入力してください。`);
      if (confirmation === account.name) { try { store.deleteAccount(account.id); resetActivityForm(); toast("活動アカウントを削除しました"); } catch (error) { alert(error.message); } }
      else if (confirmation !== null) alert("活動アカウント名が一致しません。");
    }
  });
  $("#historySearch").addEventListener("input", renderHistory); $("#historyPeriod").addEventListener("change", renderHistory);
  ["#mapMetric", "#mapMaterial", "#mapPeriod"].forEach((selector) => $(selector).addEventListener("change", renderActivityMap));
  ["#apartmentArea", "#apartmentStatus", "#apartmentUnits", "#apartmentSort"].forEach((selector) => $(selector).addEventListener("input", () => { renderApartments(); renderApartmentMap(); }));
  $("#newApartmentButton").addEventListener("click", () => openApartmentDialog()); $("#apartmentForm").addEventListener("submit", saveApartment);
  $("#deleteApartment").addEventListener("click", () => { const id = $("#apartmentId").value; if (id && confirm("このマンション情報を削除しますか？")) { store.deleteApartment(id); $("#apartmentDialog").close(); } });
  ["#analysisPeriod", "#analysisMaterial"].forEach((selector) => $(selector).addEventListener("change", renderAnalysis));
  $("#shareAnalysisText").addEventListener("click", () => shareText(analysisShareText(), "ポス活ログ 活動レポート")); $("#shareAnalysisImage").addEventListener("click", shareAnalysisImage);
  $("#shareLatest").addEventListener("click", () => { const item = store.get().activities[0]; if (item) shareText(activityShareText(item)); else toast("共有できる活動記録がありません"); });
  $("#saveGoal").addEventListener("click", () => { store.saveGoal(monthKey(), $("#monthlyGoal").value); toast("月間目標を保存しました"); });
  $("#createMaterial").addEventListener("click", () => { const name = $("#newMaterialName").value.trim(); if (!name) return; store.saveMaterial({ id: uid("material"), name, active: true }); $("#newMaterialName").value = ""; });
  $("#accountSwitcher").addEventListener("change", (event) => { if (timerStarted) { alert("活動時間の計測中は活動アカウントを切り替えられません。"); event.target.value = store.getActiveAccount().id; return; } store.switchAccount(event.target.value); resetActivityForm(); pendingImport = []; toast(`${store.getActiveAccount().name}に切り替えました`); });
  $("#createAccount").addEventListener("click", () => { if (timerStarted) { alert("活動時間の計測中は活動アカウントを追加できません。"); return; } try { store.createAccount($("#newAccountName").value); $("#newAccountName").value = ""; resetActivityForm(); pendingImport = []; toast("活動アカウントを追加しました"); } catch (error) { alert(error.message); } });
  $("#csvFile").addEventListener("change", (event) => { if (event.target.files[0]) previewCsv(event.target.files[0]); }); $("#confirmImport").addEventListener("click", confirmImport);
  $("#exportActivities").addEventListener("click", exportActivities); $("#exportApartments").addEventListener("click", exportApartments); $("#exportAll").addEventListener("click", exportAllCsv);
  $("#loginButton").addEventListener("click", async () => { try { if (firebaseAdapter.user()) await firebaseAdapter.signOut(); else await firebaseAdapter.signIn(); } catch (error) { alert(error.message); } });
  $("#deleteGoogleAccountData").addEventListener("click", async () => { const confirmation = prompt("全活動アカウントを削除するには「全削除」と入力してください。\n先に各アカウントのCSVを保存することをおすすめします。"); if (confirmation !== "全削除") return; try { const result = await firebaseAdapter.deleteAccount(); toast("ポス活ログの全データを削除しました"); if (result?.reload) setTimeout(() => window.location.reload(), 700); } catch (error) { alert(`削除できませんでした。再ログイン後にお試しください。\n${error.message}`); } });
}

async function init() {
  $("#todayLabel").textContent = dateFormat.format(new Date()); $("#demographicDate").textContent = `${DEMOGRAPHICS_AS_OF}現在`; resetActivityForm(); bindEvents(); store.subscribe(renderAll); renderAll();
  const firebase = await firebaseAdapter.init();
  if (firebase.configured) { $("#firebaseStatus").textContent = "Firebase設定を読み込みました。Googleログインすると複数端末で同期します。"; $("#syncBadge").textContent = "ログイン待ち"; } else { $("#loginButton").textContent = "Firebase設定が必要"; }
  window.addEventListener("poskatsu-auth", (event) => { const user = event.detail.user; $("#loginButton").textContent = user ? "ログアウト" : "Googleでログイン"; $("#syncBadge").textContent = user ? `${user.displayName || "Googleアカウント"}・同期中` : "端末内保存"; renderAll(); });
  window.addEventListener("poskatsu-sync", (event) => { $("#syncBadge").textContent = event.detail.status === "synced" ? "同期済み" : "同期エラー"; });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(console.error);
  console.info(BOUNDARY_CREDIT);
}

init();

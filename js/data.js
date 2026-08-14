import { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF } from "../data/demographics.js";

export { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF };

export const TOWN_TOPOJSON_URL = "https://geoshape.ex.nii.ac.jp/ka/topojson/2020/13/r2ka13109.topojson";
export const DEMOGRAPHICS_SOURCE = "https://www.city.shinagawa.tokyo.jp/PC/kuseizyoho/kuseizyoho-siryo/kuseizyoho-siryo-toukei/hpg000014926.html";
export const BOUNDARY_CREDIT = "『国勢調査町丁・字等別境界データセット』（CODH作成）「令和2年国勢調査町丁・字等別境界データ」（e-Stat）を加工 doi:10.20676/00000450";

export const DEFAULT_MATERIALS = [
  { id: "material-default", name: "配布物（未指定）", active: true }
];

export const INITIAL_APARTMENTS = [
  {
    id: "apt-atlas-gotanda",
    name: "アトラスタワー五反田",
    address: "東京都品川区西五反田2丁目22番6号",
    area: "西五反田2丁目",
    units: 213,
    lat: 35.62508,
    lng: 139.72037,
    postingStatus: "unknown",
    confidence: "candidate",
    checkedAt: "",
    reason: "",
    memo: "",
    sourceUrl: "https://db.self-in.com/city/667.html",
    history: []
  },
  {
    id: "apt-togoshi-park-tower",
    name: "ザ・パークハウス戸越公園タワー",
    address: "東京都品川区戸越5丁目19番2号",
    area: "戸越5丁目",
    units: 241,
    lat: 35.60884,
    lng: 139.71853,
    postingStatus: "unknown",
    confidence: "candidate",
    checkedAt: "",
    reason: "",
    memo: "",
    sourceUrl: "https://db.self-in.com/city/667.html",
    history: []
  },
  {
    id: "apt-geo-shinagawa-tennozu",
    name: "ジオ品川天王洲",
    address: "東京都品川区東品川1丁目39番18号",
    area: "東品川1丁目",
    units: 135,
    lat: 35.62033,
    lng: 139.74563,
    postingStatus: "unknown",
    confidence: "candidate",
    checkedAt: "",
    reason: "",
    memo: "",
    sourceUrl: "https://db.self-in.com/city/667.html",
    history: []
  }
];

export const createInitialState = () => ({
  version: 1,
  activities: [],
  materials: structuredClone(DEFAULT_MATERIALS),
  workers: [],
  apartments: structuredClone(INITIAL_APARTMENTS),
  goals: {},
  importMappings: {},
  updatedAt: new Date().toISOString()
});

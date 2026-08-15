import { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF } from "../data/demographics.js";

export { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF };

export const TOWN_TOPOJSON_URL = "https://geoshape.ex.nii.ac.jp/ka/topojson/2020/13/r2ka13109.topojson";
export const DEMOGRAPHICS_SOURCE = "https://www.city.shinagawa.tokyo.jp/PC/kuseizyoho/kuseizyoho-siryo/kuseizyoho-siryo-toukei/hpg000014926.html";
export const BOUNDARY_CREDIT = "『国勢調査町丁・字等別境界データセット』（CODH作成）「令和2年国勢調査町丁・字等別境界データ」（e-Stat）を加工 doi:10.20676/00000450";

export const DEFAULT_MATERIALS = [
  { id: "material-default", name: "配布物（未指定）", active: true }
];

export const APARTMENT_BASELINE_VERSION = 3;

const APARTMENT_LOCATIONS = {
  "apt-osaki-west-city-towers": { lat: 35.616511, lng: 139.727781 },
  "apt-brillia-towers-meguro": { lat: 35.632591, lng: 139.716732 },
  "apt-prime-parks-shinagawa-seaside-tower": { lat: 35.607611, lng: 139.747676 },
  "apt-park-tower-gran-sky": { lat: 35.624242, lng: 139.727238 },
  "apt-park-city-osaki-tower": { lat: 35.622506, lng: 139.731699 },
  "apt-grand-maison-shinagawa-seaside": { lat: 35.609913, lng: 139.746634 },
  "apt-city-tower-oimachi": { lat: 35.605429, lng: 139.730842 },
  "apt-park-city-musashikoyama-tower": { lat: 35.620137, lng: 139.704971 },
  "apt-city-tower-musashikoyama": { lat: 35.620589, lng: 139.705549 },
  "apt-laguna-tower": { lat: 35.616076, lng: 139.748207 },
  "apt-ober-grandio-shinagawa-katsushima": { lat: 35.599215, lng: 139.744729 },
  "apt-shinagawa-seaside-residence": { lat: 35.615306, lng: 139.750012 },
  "apt-crest-tower-shinagawa-seaside": { lat: 35.606851, lng: 139.750087 },
  "apt-shinagawa-east-city-tower": { lat: 35.622937, lng: 139.753587 },
  "apt-tokyo-nile": { lat: 35.604427, lng: 139.745506 },
  "apt-branz-city-shinagawa-katsushima": { lat: 35.600599, lng: 139.746541 },
  "apt-park-tower-tokyo-south": { lat: 35.622731, lng: 139.729207 },
  "apt-prime-parks-shinagawa-seaside-residence": { lat: 35.606202, lng: 139.747762 },
  "apt-city-tower-shinagawa-park-front": { lat: 35.590196, lng: 139.736607 },
  "apt-proud-tower-meguro-marc": { lat: 35.628794, lng: 139.717454 },
  "apt-j-tower-nishioi": { lat: 35.600806, lng: 139.721565 },
  "apt-gentry-house-shinagawa-oi": { lat: 35.601386, lng: 139.730233 },
  "apt-proud-tower-higashigotanda": { lat: 35.624629, lng: 139.725911 },
  "apt-park-homes-musashikoyama": { lat: 35.620524, lng: 139.706278 },
  "apt-city-tower-osaki": { lat: 35.621515, lng: 139.725601 },
  "apt-brillia-oimachi-lavie-tower": { lat: 35.607445, lng: 139.73016 },
  "apt-core-stare-nishioi": { lat: 35.601766, lng: 139.722756 },
  "apt-city-terrace-shinagawa-east": { lat: 35.622264, lng: 139.753529 },
  "apt-le-cinq-osaki-city-tower": { lat: 35.623546, lng: 139.726105 },
  "apt-city-tower-meguro": { lat: 35.627393, lng: 139.71612 },
  "apt-vert-clair-osaki": { address: "東京都品川区大崎4丁目12番22号", lat: 35.617825, lng: 139.720154 },
  "apt-gloria-hatsuho-gotenyama": { address: "東京都品川区北品川5丁目7番14号", lat: 35.620506, lng: 139.731201 },
  "apt-park-house-o-tower": { address: "東京都品川区大崎3丁目1番1号", lat: 35.621609, lng: 139.724609 },
  "apt-park-habio-ebara-nakanobu-ekimae": { address: "東京都品川区東中延1丁目9番13号", lat: 35.609585, lng: 139.711838 },
  "apt-crescent-shinagawa": { address: "東京都品川区東品川1丁目8番1号", lat: 35.622314, lng: 139.743652 },
  "apt-dresse-meguro-impres-tower": { address: "東京都品川区西五反田3丁目2番6号", lat: 35.629482, lng: 139.716736 },
  "apt-abity-meguro": { address: "東京都品川区上大崎2丁目10番11号", lat: 35.636848, lng: 139.716843 },
  "apt-park-habio-minami-oi": { address: "東京都品川区南大井4丁目10番5号", lat: 35.595959, lng: 139.736816 },
  "apt-park-habio-meguro-sakuratei": { address: "東京都品川区上大崎4丁目5番37号", lat: 35.628273, lng: 139.715729 },
  "apt-premium-cube-g-osaki": { address: "東京都品川区西品川2丁目2番25号", lat: 35.614231, lng: 139.727966 }
};

const apartmentCandidate = (id, name, area, units, sourceUrl, address = `東京都品川区${area}`) => {
  const location = APARTMENT_LOCATIONS[id] || {};
  return {
    id,
    name,
    address: location.address || address,
    area,
    units,
    lat: location.lat ?? null,
    lng: location.lng ?? null,
    postingStatus: "unknown",
    confidence: "candidate",
    checkedAt: "",
    reason: "",
    memo: "公開マンション情報と公開地図を2026年8月15日に確認。配布可否は現地確認が必要。",
    sourceUrl,
    history: []
  };
};

const NOMU_RANKING_URL = "https://www.nomu.com/mansion/library/ranking/units/shinagawa/";
const STEPON_LIBRARY_URL = "https://www.stepon.co.jp/mansion/library/area_13/list_13_109/";
const MEC_RENT_URL = "https://www.mec-h.com/rent/area/13/13109";

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
  },
  {
    ...apartmentCandidate("apt-osaki-west-city-towers", "大崎ウエストシティタワーズ", "大崎2丁目", 1090, "https://www.nomu.com/mansion/library/id/P0010451/"),
    confidence: "review",
    memo: "2026年8月15日確認。ノムコムは1,090戸、住まい1は1,084戸と掲載しており要再確認。位置は公開地図で確認済み、配布可否は現地確認が必要。"
  },
  apartmentCandidate("apt-brillia-towers-meguro", "ブリリアタワーズ目黒", "上大崎3丁目", 940, "https://www.nomu.com/mansion/library/id/P0029871/"),
  apartmentCandidate("apt-prime-parks-shinagawa-seaside-tower", "プライムパークス品川シーサイド ザ・タワー", "東品川4丁目", 817, "https://www.nomu.com/mansion/library/id/P0032902/"),
  apartmentCandidate("apt-park-tower-gran-sky", "パークタワーグランスカイ", "東五反田2丁目", 739, "https://www.nomu.com/mansion/library/id/P0010072/"),
  apartmentCandidate("apt-park-city-osaki-tower", "パークシティ大崎 ザ タワー", "北品川5丁目", 734, "https://www.nomu.com/mansion/library/id/P0027018/"),
  apartmentCandidate("apt-grand-maison-shinagawa-seaside", "グランドメゾン品川シーサイドの杜", "東品川4丁目", 687, "https://www.nomu.com/mansion/library/id/P0034383/"),
  apartmentCandidate("apt-city-tower-oimachi", "シティタワー大井町", "大井1丁目", 635, "https://www.nomu.com/mansion/library/id/P0034419/"),
  apartmentCandidate("apt-park-city-musashikoyama-tower", "パークシティ武蔵小山ザ タワー", "小山3丁目", 628, "https://www.nomu.com/mansion/library/id/P0034380/"),
  apartmentCandidate("apt-city-tower-musashikoyama", "シティタワー武蔵小山", "小山3丁目", 506, "https://www.nomu.com/mansion/library/id/P0036485/"),
  apartmentCandidate("apt-laguna-tower", "ラグナタワー", "東品川3丁目", 501, "https://www.nomu.com/mansion/library/id/P0006799/"),
  apartmentCandidate("apt-ober-grandio-shinagawa-katsushima", "オーベルグランディオ品川勝島", "勝島1丁目", 452, "https://www.nomu.com/mansion/library/id/P0028706/"),
  apartmentCandidate("apt-shinagawa-seaside-residence", "品川シーサイドレジデンス", "東品川3丁目", 422, "https://www.nomu.com/mansion/library/id/P0010059/"),
  apartmentCandidate("apt-crest-tower-shinagawa-seaside", "クレストタワー品川シーサイド", "東大井1丁目", 398, "https://www.nomu.com/mansion/library/id/P0010598/"),
  apartmentCandidate("apt-shinagawa-east-city-tower", "品川イーストシティタワー", "東品川5丁目", 363, "https://www.nomu.com/mansion/library/id/P0032158/"),
  apartmentCandidate("apt-tokyo-nile", "東京ナイル", "東大井1丁目", 361, "https://www.nomu.com/mansion/library/id/P0015061/"),
  apartmentCandidate("apt-branz-city-shinagawa-katsushima", "ブランズシティ品川勝島", "勝島1丁目", 356, NOMU_RANKING_URL),
  apartmentCandidate("apt-park-tower-tokyo-south", "ザ・パークタワー東京サウス", "東五反田2丁目", 346, NOMU_RANKING_URL),
  apartmentCandidate("apt-prime-parks-shinagawa-seaside-residence", "プライムパークス品川シーサイド ザ・レジデンス", "東大井1丁目", 335, NOMU_RANKING_URL),
  apartmentCandidate("apt-city-tower-shinagawa-park-front", "シティタワー品川パークフロント", "南大井2丁目", 312, NOMU_RANKING_URL),
  apartmentCandidate("apt-proud-tower-meguro-marc", "プラウドタワー目黒MARC", "西五反田3丁目", 301, NOMU_RANKING_URL),
  apartmentCandidate("apt-j-tower-nishioi", "ジェイタワー西大井", "西大井1丁目", 297, NOMU_RANKING_URL),
  apartmentCandidate("apt-gentry-house-shinagawa-oi", "ジェントリーハウス品川大井", "大井3丁目", 294, NOMU_RANKING_URL),
  apartmentCandidate("apt-proud-tower-higashigotanda", "プラウドタワー東五反田", "東五反田2丁目", 289, NOMU_RANKING_URL),
  apartmentCandidate("apt-park-homes-musashikoyama", "パークホームズ武蔵小山", "小山3丁目", 278, NOMU_RANKING_URL),
  apartmentCandidate("apt-city-tower-osaki", "シティタワー大崎", "大崎5丁目", 271, NOMU_RANKING_URL),
  apartmentCandidate("apt-brillia-oimachi-lavie-tower", "ブリリア大井町ラヴィアンタワー", "大井1丁目", 269, NOMU_RANKING_URL),
  apartmentCandidate("apt-core-stare-nishioi", "コアスターレ西大井", "西大井1丁目", 266, NOMU_RANKING_URL),
  apartmentCandidate("apt-city-terrace-shinagawa-east", "シティテラス品川イースト", "東品川5丁目", 254, NOMU_RANKING_URL),
  apartmentCandidate("apt-le-cinq-osaki-city-tower", "ル・サンク大崎シティタワー", "大崎1丁目", 254, NOMU_RANKING_URL),
  apartmentCandidate("apt-city-tower-meguro", "シティタワー目黒", "西五反田3丁目", 244, NOMU_RANKING_URL),
  {
    ...apartmentCandidate("apt-vert-clair-osaki", "ヴェール・クレール大崎", "大崎4丁目", 140, MEC_RENT_URL),
    confidence: "review",
    memo: "2026年8月15日確認。公式物件概要は140戸、住まいリレー検索結果は230戸と掲載しており、公式値を採用。位置は住居表示から確認済み、配布可否は現地確認が必要。"
  },
  apartmentCandidate("apt-gloria-hatsuho-gotenyama", "グローリア初穂御殿山", "北品川5丁目", 174, "https://www.sumai1.com/buyers/mansion/library/tpk_ML0003/?ensen_eki_cd%5B%5D=2159480&soukosu=100&todofuken_cd=13", "東京都品川区北品川5丁目7番14号"),
  apartmentCandidate("apt-park-house-o-tower", "パークハウスオー・タワー", "大崎3丁目", 153, MEC_RENT_URL),
  apartmentCandidate("apt-park-habio-ebara-nakanobu-ekimae", "ザ・パークハビオ荏原中延駅前", "東中延1丁目", 140, MEC_RENT_URL),
  apartmentCandidate("apt-crescent-shinagawa", "クレッセント品川", "東品川1丁目", 135, "https://www.stepon.co.jp/mansion/library/area_13/townlist_13_109_018/"),
  apartmentCandidate("apt-dresse-meguro-impres-tower", "ドレッセ目黒インプレスタワー", "西五反田3丁目", 129, STEPON_LIBRARY_URL),
  apartmentCandidate("apt-abity-meguro", "アビティ目黒", "上大崎2丁目", 116, MEC_RENT_URL),
  apartmentCandidate("apt-park-habio-minami-oi", "ザ・パークハビオ南大井", "南大井4丁目", 109, MEC_RENT_URL),
  apartmentCandidate("apt-park-habio-meguro-sakuratei", "ザ・パークハビオ目黒桜邸", "上大崎4丁目", 106, MEC_RENT_URL),
  apartmentCandidate("apt-premium-cube-g-osaki", "ザ・プレミアムキューブG大崎", "西品川2丁目", 104, "https://www.stepon.co.jp/mansion/library/area_13/townlist_13_109_013/")
];

export const createInitialState = () => ({
  version: 1,
  activities: [],
  materials: structuredClone(DEFAULT_MATERIALS),
  workers: [],
  apartments: structuredClone(INITIAL_APARTMENTS),
  apartmentBaselineVersion: APARTMENT_BASELINE_VERSION,
  deletedInitialApartmentIds: [],
  goals: {},
  importMappings: {},
  updatedAt: new Date().toISOString()
});

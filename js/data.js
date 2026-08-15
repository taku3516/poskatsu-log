import { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF } from "../data/demographics.js";

export { DEMOGRAPHICS, DEMOGRAPHICS_AS_OF };

export const TOWN_TOPOJSON_URL = "https://geoshape.ex.nii.ac.jp/ka/topojson/2020/13/r2ka13109.topojson";
export const DEMOGRAPHICS_SOURCE = "https://www.city.shinagawa.tokyo.jp/PC/kuseizyoho/kuseizyoho-siryo/kuseizyoho-siryo-toukei/hpg000014926.html";
export const BOUNDARY_CREDIT = "『国勢調査町丁・字等別境界データセット』（CODH作成）「令和2年国勢調査町丁・字等別境界データ」（e-Stat）を加工 doi:10.20676/00000450";

export const DEFAULT_MATERIALS = [
  { id: "material-default", name: "配布物（未指定）", active: true }
];

export const APARTMENT_BASELINE_VERSION = 2;

const apartmentCandidate = (id, name, area, units, sourceUrl, address = `東京都品川区${area}`) => ({
  id,
  name,
  address,
  area,
  units,
  lat: null,
  lng: null,
  postingStatus: "unknown",
  confidence: "candidate",
  checkedAt: "",
  reason: "",
  memo: "公開マンション情報を2026年8月15日に確認。番地・座標と配布可否は現地確認が必要。",
  sourceUrl,
  history: []
});

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
    memo: "2026年8月15日確認。ノムコムは1,090戸、住まい1は1,084戸と掲載しており要再確認。番地・座標と配布可否も現地確認が必要。"
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
  apartmentCandidate("apt-vert-clair-osaki", "ヴェール・クレール大崎", "大崎4丁目", 230, MEC_RENT_URL),
  apartmentCandidate("apt-gloria-hatsuho-gotenyama", "グローリア初穂御殿山", "北品川5丁目", 174, "https://www.sumai1.com/buyers/mansion/library/tpk_ML0003/?ensen_eki_cd%5B%5D=2159480&soukosu=100&todofuken_cd=13", "東京都品川区北品川5丁目7番14号"),
  apartmentCandidate("apt-park-house-o-tower", "パークハウスオー・タワー", "大崎3丁目", 153, MEC_RENT_URL),
  apartmentCandidate("apt-park-habio-ebara-nakanobu-ekimae", "ザ・パークハビオ荏原中延駅前", "東中延1丁目", 141, MEC_RENT_URL),
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

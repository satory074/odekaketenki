"""JMA station registry.

Each entry needs:
- id:          short slug used as filename and station_id (lowercase ascii)
- name:        Japanese display name
- prefecture:  Japanese prefecture name
- lat / lng:   decimal degrees
- prec_no:     JMA prefecture code used in obsdl URLs
- block_no:    JMA block code used in obsdl URLs (5-digit "wmo-style" or 4-digit AMeDAS)
- kind:        "s1" for地方気象台 (synoptic), "a1" for AMeDAS only

prec_no / block_no values come from the JMA station list; they identify the URL
parameters used in https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php
(for synoptic stations) or daily_a1.php (for AMeDAS-only).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class StationRef:
    id: str
    name: str
    prefecture: str
    lat: float
    lng: float
    prec_no: int
    block_no: str
    kind: str = "s1"  # s1 = synoptic, a1 = AMeDAS


# Curated list of 47 prefectural-capital-equivalent synoptic stations covering all of Japan.
# Codes verified against the JMA station directory (subject to drift; verify before bulk runs).
STATIONS: list[StationRef] = [
    StationRef("sapporo", "札幌", "北海道", 43.0606, 141.3287, 14, "47412"),
    StationRef("aomori", "青森", "青森県", 40.8222, 140.7681, 31, "47575"),
    StationRef("morioka", "盛岡", "岩手県", 39.6986, 141.1689, 33, "47584"),
    StationRef("sendai", "仙台", "宮城県", 38.2615, 140.8966, 34, "47590"),
    StationRef("akita", "秋田", "秋田県", 39.7178, 140.0961, 32, "47582"),
    StationRef("yamagata", "山形", "山形県", 38.2554, 140.3397, 35, "47588"),
    StationRef("fukushima", "福島", "福島県", 37.7610, 140.4733, 36, "47595"),
    StationRef("mito", "水戸", "茨城県", 36.3805, 140.4674, 40, "47629"),
    StationRef("utsunomiya", "宇都宮", "栃木県", 36.5483, 139.8686, 41, "47615"),
    StationRef("maebashi", "前橋", "群馬県", 36.4060, 139.0606, 42, "47624"),
    StationRef("kumagaya", "熊谷", "埼玉県", 36.1473, 139.3803, 43, "47626"),
    StationRef("chiba", "千葉", "千葉県", 35.6017, 140.1064, 45, "47682"),
    StationRef("tokyo", "東京", "東京都", 35.6895, 139.6917, 44, "47662"),
    StationRef("yokohama", "横浜", "神奈川県", 35.4438, 139.6380, 46, "47670"),
    StationRef("niigata", "新潟", "新潟県", 37.8954, 139.0246, 54, "47604"),
    StationRef("toyama", "富山", "富山県", 36.7081, 137.2107, 55, "47607"),
    StationRef("kanazawa", "金沢", "石川県", 36.5947, 136.6256, 56, "47605"),
    StationRef("fukui", "福井", "福井県", 36.0613, 136.2237, 57, "47616"),
    StationRef("kofu", "甲府", "山梨県", 35.6644, 138.5683, 49, "47638"),
    StationRef("nagano", "長野", "長野県", 36.6635, 138.1810, 48, "47610"),
    StationRef("gifu", "岐阜", "岐阜県", 35.4232, 136.7626, 52, "47632"),
    StationRef("shizuoka", "静岡", "静岡県", 34.9756, 138.3828, 50, "47656"),
    StationRef("nagoya", "名古屋", "愛知県", 35.1815, 136.9066, 51, "47636"),
    StationRef("tsu", "津", "三重県", 34.7184, 136.5056, 53, "47651"),
    StationRef("otsu", "大津", "滋賀県", 35.0045, 135.8686, 60, "47761"),
    StationRef("kyoto", "京都", "京都府", 35.0116, 135.7681, 61, "47759"),
    StationRef("osaka", "大阪", "大阪府", 34.6937, 135.5023, 62, "47772"),
    StationRef("kobe", "神戸", "兵庫県", 34.6901, 135.1955, 63, "47770"),
    StationRef("nara", "奈良", "奈良県", 34.6851, 135.8050, 64, "47780"),
    StationRef("wakayama", "和歌山", "和歌山県", 34.2305, 135.1708, 65, "47777"),
    StationRef("tottori", "鳥取", "鳥取県", 35.5039, 134.2381, 69, "47746"),
    StationRef("matsue", "松江", "島根県", 35.4723, 133.0505, 68, "47741"),
    StationRef("okayama", "岡山", "岡山県", 34.6618, 133.9344, 66, "47768"),
    StationRef("hiroshima", "広島", "広島県", 34.3853, 132.4553, 67, "47765"),
    StationRef("yamaguchi", "山口", "山口県", 34.1858, 131.4706, 81, "47784"),
    StationRef("tokushima", "徳島", "徳島県", 34.0658, 134.5594, 71, "47895"),
    StationRef("takamatsu", "高松", "香川県", 34.3401, 134.0434, 72, "47891"),
    StationRef("matsuyama", "松山", "愛媛県", 33.8416, 132.7657, 73, "47887"),
    StationRef("kochi", "高知", "高知県", 33.5597, 133.5311, 74, "47893"),
    StationRef("fukuoka", "福岡", "福岡県", 33.5904, 130.4017, 82, "47807"),
    StationRef("saga", "佐賀", "佐賀県", 33.2494, 130.2989, 85, "47813"),
    StationRef("nagasaki", "長崎", "長崎県", 32.7503, 129.8779, 84, "47817"),
    StationRef("kumamoto", "熊本", "熊本県", 32.7898, 130.7417, 86, "47819"),
    StationRef("oita", "大分", "大分県", 33.2382, 131.6126, 83, "47815"),
    StationRef("miyazaki", "宮崎", "宮崎県", 31.9077, 131.4202, 87, "47830"),
    StationRef("kagoshima", "鹿児島", "鹿児島県", 31.5602, 130.5581, 88, "47827"),
    StationRef("naha", "那覇", "沖縄県", 26.2124, 127.6809, 91, "47936"),
    # ----- below: auto-discovered stations from discover_stations.py -----
    # ----- DISCOVERED_BLOCK_START -----
    StationRef("wakkanai", "稚内", "北海道", 45.415, 141.6783, 11, "47401", kind="s1"),
    StationRef("kitamiesashi", "北見枝幸", "北海道", 44.94, 142.585, 11, "47402", kind="s1"),
    StationRef("asahikawa", "旭川", "北海道", 43.7567, 142.3717, 12, "47407", kind="s1"),
    StationRef("hahoro", "羽幌", "北海道", 44.3633, 141.7, 13, "47404", kind="s1"),
    StationRef("rumoi", "留萌", "北海道", 43.945, 141.6317, 13, "47406", kind="s1"),
    StationRef("iwamizawa", "岩見沢", "北海道", 43.2117, 141.785, 15, "47413", kind="s1"),
    StationRef("otaru", "小樽", "北海道", 43.1817, 141.015, 16, "47411", kind="s1"),
    StationRef("kutchan", "倶知安", "北海道", 42.9, 140.7567, 16, "47433", kind="s1"),
    StationRef("suttsu", "寿都", "北海道", 42.795, 140.2233, 16, "47421", kind="s1"),
    StationRef("omu", "雄武", "北海道", 44.58, 142.9633, 17, "47405", kind="s1"),
    StationRef("mombetsu", "紋別", "北海道", 44.345, 143.355, 17, "47435", kind="s1"),
    StationRef("abashiri", "網走", "北海道", 44.0167, 144.2783, 17, "47409", kind="s1"),
    StationRef("nemuro", "根室", "北海道", 43.33, 145.585, 18, "47420", kind="s1"),
    StationRef("kushiro", "釧路", "北海道", 42.985, 144.3767, 19, "47418", kind="s1"),
    StationRef("obihiro", "帯広", "北海道", 42.9217, 143.2117, 20, "47417", kind="s1"),
    StationRef("hiroo", "広尾", "北海道", 42.2933, 143.3167, 20, "47440", kind="s1"),
    StationRef("tomakomai", "苫小牧", "北海道", 42.6233, 141.5467, 21, "47424", kind="s1"),
    StationRef("muroran", "室蘭", "北海道", 42.3117, 140.975, 21, "47423", kind="s1"),
    StationRef("urakawa", "浦河", "北海道", 42.1617, 142.7767, 22, "47426", kind="s1"),
    StationRef("hakodate", "函館", "北海道", 41.8167, 140.7533, 23, "47430", kind="s1"),
    StationRef("esashi", "江差", "北海道", 41.8667, 140.1233, 24, "47428", kind="s1"),
    StationRef("mutsu", "むつ", "青森県", 41.2833, 141.21, 31, "47576", kind="s1"),
    StationRef("fukaura", "深浦", "青森県", 40.645, 139.9317, 31, "47574", kind="s1"),
    StationRef("hachinohe", "八戸", "青森県", 40.5267, 141.5217, 31, "47581", kind="s1"),
    StationRef("miyako", "宮古", "岩手県", 39.6467, 141.965, 33, "47585", kind="s1"),
    StationRef("ofunato", "大船渡", "岩手県", 39.0633, 141.7133, 33, "47512", kind="s1"),
    StationRef("ishinomaki", "石巻", "宮城県", 38.4267, 141.2983, 34, "47592", kind="s1"),
    StationRef("sakata", "酒田", "山形県", 38.9083, 139.8433, 35, "47587", kind="s1"),
    StationRef("shinjou-35-47520", "新庄", "山形県", 38.7567, 140.3117, 35, "47520", kind="s1"),
    StationRef("wakamatsu", "若松", "福島県", 37.4883, 139.91, 36, "47570", kind="s1"),
    StationRef("shirakawa", "白河", "福島県", 37.1317, 140.215, 36, "47597", kind="s1"),
    StationRef("onahama", "小名浜", "福島県", 36.9467, 140.9033, 36, "47598", kind="s1"),
    StationRef("tsukubatateno", "つくば（館野）", "茨城県", 36.0567, 140.125, 40, "47646", kind="s1"),
    StationRef("okunikkounikkou", "奥日光（日光）", "栃木県", 36.7383, 139.5, 41, "47690", kind="s1"),
    StationRef("chichibu", "秩父", "埼玉県", 35.99, 139.0733, 43, "47641", kind="s1"),
    StationRef("oshima", "大島", "東京都", 34.7483, 139.3617, 44, "47675", kind="s1"),
    StationRef("miyakeshima", "三宅島", "東京都", 34.1233, 139.52, 44, "47677", kind="s1"),
    StationRef("hachijoushima", "八丈島", "東京都", 33.1217, 139.7783, 44, "47678", kind="s1"),
    StationRef("chichishima", "父島", "東京都", 27.0917, 142.19, 44, "47971", kind="s1"),
    StationRef("minamitorishima", "南鳥島", "東京都", 24.2883, 153.9833, 44, "47991", kind="s1"),
    StationRef("choshi", "銚子", "千葉県", 35.7383, 140.8567, 45, "47648", kind="s1"),
    StationRef("katsuura", "勝浦", "千葉県", 35.15, 140.3117, 45, "47674", kind="s1"),
    StationRef("tateyama", "館山", "千葉県", 34.9867, 139.865, 45, "47672", kind="s1"),
    StationRef("karuizawa", "軽井沢", "長野県", 36.3417, 138.5467, 48, "47622", kind="s1"),
    StationRef("matsumoto", "松本", "長野県", 36.2467, 137.97, 48, "47618", kind="s1"),
    StationRef("suwa", "諏訪", "長野県", 36.045, 138.1083, 48, "47620", kind="s1"),
    StationRef("iida", "飯田", "長野県", 35.5233, 137.8217, 48, "47637", kind="s1"),
    StationRef("kawaguchiko", "河口湖", "山梨県", 35.5, 138.76, 49, "47640", kind="s1"),
    StationRef("fujisan", "富士山", "山梨県", 35.36, 138.7267, 49, "47639", kind="s1"),
    StationRef("mishima", "三島", "静岡県", 35.1133, 138.925, 50, "47657", kind="s1"),
    StationRef("ajiro", "網代", "静岡県", 35.045, 139.0917, 50, "47668", kind="s1"),
    StationRef("hamamatsu", "浜松", "静岡県", 34.7533, 137.7117, 50, "47654", kind="s1"),
    StationRef("omaezaki", "御前崎", "静岡県", 34.6033, 138.2133, 50, "47655", kind="s1"),
    StationRef("irousaki", "石廊崎", "静岡県", 34.6033, 138.8417, 50, "47666", kind="s1"),
    StationRef("fujisan-50-47639", "富士山", "静岡県", 35.36, 138.7267, 50, "47639", kind="s1"),
    StationRef("irako", "伊良湖", "愛知県", 34.6283, 137.0933, 51, "47653", kind="s1"),
    StationRef("kozan", "高山", "岐阜県", 36.155, 137.2533, 52, "47617", kind="s1"),
    StationRef("yokkaichi", "四日市", "三重県", 34.94, 136.58, 53, "47684", kind="s1"),
    StationRef("ueno", "上野", "三重県", 34.7617, 136.1417, 53, "47649", kind="s1"),
    StationRef("owase", "尾鷲", "三重県", 34.0683, 136.1933, 53, "47663", kind="s1"),
    StationRef("aikawa", "相川", "新潟県", 38.0283, 138.24, 54, "47602", kind="s1"),
    StationRef("takada", "高田", "新潟県", 37.1067, 138.2467, 54, "47612", kind="s1"),
    StationRef("fushiki", "伏木", "富山県", 36.7917, 137.055, 55, "47606", kind="s1"),
    StationRef("washima", "輪島", "石川県", 37.39, 136.895, 56, "47600", kind="s1"),
    StationRef("tsuruga", "敦賀", "福井県", 35.6533, 136.0617, 57, "47631", kind="s1"),
    StationRef("ibukiyama", "伊吹山", "滋賀県", 35.4183, 136.4133, 60, "47751", kind="s1"),
    StationRef("maizuru", "舞鶴", "京都府", 35.45, 135.3167, 61, "47750", kind="s1"),
    StationRef("toyooka", "豊岡", "兵庫県", 35.535, 134.8217, 63, "47747", kind="s1"),
    StationRef("himeji", "姫路", "兵庫県", 34.8383, 134.67, 63, "47769", kind="s1"),
    StationRef("sumoto", "洲本", "兵庫県", 34.31, 134.8483, 63, "47776", kind="s1"),
    StationRef("shionomisaki", "潮岬", "和歌山県", 33.45, 135.7567, 65, "47778", kind="s1"),
    StationRef("tsuyama", "津山", "岡山県", 35.0633, 134.0083, 66, "47756", kind="s1"),
    StationRef("fukuyama", "福山", "広島県", 34.4467, 133.2467, 67, "47767", kind="s1"),
    StationRef("kure", "呉", "広島県", 34.24, 132.55, 67, "47766", kind="s1"),
    StationRef("saigou", "西郷", "島根県", 36.2033, 133.3333, 68, "47740", kind="s1"),
    StationRef("hamada", "浜田", "島根県", 34.8967, 132.07, 68, "47755", kind="s1"),
    StationRef("sakai-69-47742", "境", "鳥取県", 35.5433, 133.235, 69, "47742", kind="s1"),
    StationRef("yonago", "米子", "鳥取県", 35.4333, 133.3383, 69, "47744", kind="s1"),
    StationRef("kenzan", "剣山", "徳島県", 33.8533, 134.0967, 71, "47894", kind="s1"),
    StationRef("tadotsu", "多度津", "香川県", 34.275, 133.7517, 72, "47890", kind="s1"),
    StationRef("uwashima", "宇和島", "愛媛県", 33.2267, 132.5517, 73, "47892", kind="s1"),
    StationRef("murotomisaki", "室戸岬", "高知県", 33.2517, 134.1767, 74, "47899", kind="s1"),
    StationRef("sukumo", "宿毛", "高知県", 32.905, 132.7167, 74, "47897", kind="s1"),
    StationRef("shimizu-74-47898", "清水", "高知県", 32.7217, 133.01, 74, "47898", kind="s1"),
    StationRef("hagi", "萩", "山口県", 34.41, 131.405, 81, "47754", kind="s1"),
    StationRef("shimonoseki-81-47762", "下関", "山口県", 33.9483, 130.925, 81, "47762", kind="s1"),
    StationRef("iizuka", "飯塚", "福岡県", 33.6517, 130.6933, 82, "47809", kind="s1"),
    StationRef("hita", "日田", "大分県", 33.3217, 130.9283, 83, "47814", kind="s1"),
    StationRef("izuhara", "厳原", "長崎県", 34.1967, 129.2917, 84, "47800", kind="s1"),
    StationRef("hirado", "平戸", "長崎県", 33.36, 129.55, 84, "47805", kind="s1"),
    StationRef("sasebo", "佐世保", "長崎県", 33.1583, 129.7267, 84, "47812", kind="s1"),
    StationRef("unzendake", "雲仙岳", "長崎県", 32.7367, 130.2617, 84, "47818", kind="s1"),
    StationRef("fukue", "福江", "長崎県", 32.6933, 128.8267, 84, "47843", kind="s1"),
    StationRef("asoyama", "阿蘇山", "熊本県", 32.88, 131.0733, 86, "47821", kind="s1"),
    StationRef("hitoyoshi", "人吉", "熊本県", 32.2167, 130.755, 86, "47824", kind="s1"),
    StationRef("ushibuka", "牛深", "熊本県", 32.1967, 130.0267, 86, "47838", kind="s1"),
    StationRef("nobeoka", "延岡", "宮崎県", 32.5817, 131.6567, 87, "47822", kind="s1"),
    StationRef("tomishiro", "都城", "宮崎県", 31.73, 131.0817, 87, "47829", kind="s1"),
    StationRef("aburatsu", "油津", "宮崎県", 31.5783, 131.4067, 87, "47835", kind="s1"),
    StationRef("akune", "阿久根", "鹿児島県", 32.0267, 130.2, 88, "47823", kind="s1"),
    StationRef("makurazaki", "枕崎", "鹿児島県", 31.2717, 130.2917, 88, "47831", kind="s1"),
    StationRef("shushishima", "種子島", "鹿児島県", 30.72, 130.9817, 88, "47837", kind="s1"),
    StationRef("naze", "名瀬", "鹿児島県", 28.385, 129.4933, 88, "47909", kind="s1"),
    StationRef("yakushima", "屋久島", "鹿児島県", 30.385, 130.6583, 88, "47836", kind="s1"),
    StationRef("okinoerabu", "沖永良部", "鹿児島県", 27.4317, 128.705, 88, "47942", kind="s1"),
    StationRef("nago", "名護", "沖縄県", 26.5933, 127.965, 91, "47940", kind="s1"),
    StationRef("ishigakishima", "石垣島", "沖縄県", 24.3367, 124.1633, 91, "47918", kind="s1"),
    StationRef("miyakoshima", "宮古島", "沖縄県", 24.7933, 125.2783, 91, "47927", kind="s1"),
    StationRef("kumeshima", "久米島", "沖縄県", 26.3367, 126.8033, 91, "47929", kind="s1"),
    StationRef("iriomoteshima", "西表島", "沖縄県", 24.4267, 123.765, 91, "47917", kind="s1"),
    StationRef("yonakunishima", "与那国島", "沖縄県", 24.4667, 123.01, 91, "47912", kind="s1"),
    StationRef("minamidaitominamidaitoshima", "南大東（南大東島）", "沖縄県", 25.8283, 131.2283, 91, "47945", kind="s1"),
        # ----- DISCOVERED_BLOCK_END -----
]


def by_id(station_id: str) -> StationRef:
    for s in STATIONS:
        if s.id == station_id:
            return s
    raise KeyError(station_id)

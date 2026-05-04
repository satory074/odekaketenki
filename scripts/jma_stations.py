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
]


def by_id(station_id: str) -> StationRef:
    for s in STATIONS:
        if s.id == station_id:
            return s
    raise KeyError(station_id)

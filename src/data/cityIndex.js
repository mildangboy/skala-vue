/**
 * 도시 색인 — 영문명 알파벳 순으로 정렬해 관리한다.
 *
 * OpenWeatherMap의 /geo/1.0/direct는 접두어 자동완성용 API가 아니라 이름 근사 매칭이고
 * limit이 최대 5라, 'Dae'를 치면 Daye 같은 소도시가 먼저 잡혀 대구·대전이 밀려난다.
 * 한글 입력은 아예 매칭되지 않는다. 그래서 자주 찾는 도시는 로컬에서 접두어로 먼저 찾는다.
 *
 * ko는 한글 검색어와 표시용, en은 실제 API 조회에 쓰는 키다.
 */
export const CITY_INDEX = [
  { ko: '아부다비', en: 'Abu Dhabi', country: 'AE' },
  { ko: '애들레이드', en: 'Adelaide', country: 'AU' },
  { ko: '암스테르담', en: 'Amsterdam', country: 'NL' },
  { ko: '앙카라', en: 'Ankara', country: 'TR' },
  { ko: '아테네', en: 'Athens', country: 'GR' },
  { ko: '애틀랜타', en: 'Atlanta', country: 'US' },
  { ko: '오클랜드', en: 'Auckland', country: 'NZ' },
  { ko: '오스틴', en: 'Austin', country: 'US' },
  { ko: '바쿠', en: 'Baku', country: 'AZ' },
  { ko: '방콕', en: 'Bangkok', country: 'TH' },
  { ko: '바르셀로나', en: 'Barcelona', country: 'ES' },
  { ko: '베이징', en: 'Beijing', country: 'CN' },
  { ko: '베를린', en: 'Berlin', country: 'DE' },
  { ko: '보고타', en: 'Bogota', country: 'CO' },
  { ko: '보스턴', en: 'Boston', country: 'US' },
  { ko: '브리즈번', en: 'Brisbane', country: 'AU' },
  { ko: '브뤼셀', en: 'Brussels', country: 'BE' },
  { ko: '부쿠레슈티', en: 'Bucharest', country: 'RO' },
  { ko: '부다페스트', en: 'Budapest', country: 'HU' },
  { ko: '부에노스아이레스', en: 'Buenos Aires', country: 'AR' },
  { ko: '부산', en: 'Busan', country: 'KR' },
  { ko: '카이로', en: 'Cairo', country: 'EG' },
  { ko: '캘거리', en: 'Calgary', country: 'CA' },
  { ko: '케이프타운', en: 'Cape Town', country: 'ZA' },
  { ko: '창원', en: 'Changwon', country: 'KR' },
  { ko: '천안', en: 'Cheonan', country: 'KR' },
  { ko: '청주', en: 'Cheongju', country: 'KR' },
  { ko: '시카고', en: 'Chicago', country: 'US' },
  { ko: '춘천', en: 'Chuncheon', country: 'KR' },
  { ko: '코펜하겐', en: 'Copenhagen', country: 'DK' },
  { ko: '대구', en: 'Daegu', country: 'KR' },
  { ko: '대전', en: 'Daejeon', country: 'KR' },
  { ko: '댈러스', en: 'Dallas', country: 'US' },
  { ko: '델리', en: 'Delhi', country: 'IN' },
  { ko: '덴버', en: 'Denver', country: 'US' },
  { ko: '도하', en: 'Doha', country: 'QA' },
  { ko: '두바이', en: 'Dubai', country: 'AE' },
  { ko: '더블린', en: 'Dublin', country: 'IE' },
  { ko: '에든버러', en: 'Edinburgh', country: 'GB' },
  { ko: '에드먼턴', en: 'Edmonton', country: 'CA' },
  { ko: '프랑크푸르트', en: 'Frankfurt', country: 'DE' },
  { ko: '후쿠오카', en: 'Fukuoka', country: 'JP' },
  { ko: '강릉', en: 'Gangneung', country: 'KR' },
  { ko: '제네바', en: 'Geneva', country: 'CH' },
  { ko: '고양', en: 'Goyang', country: 'KR' },
  { ko: '광주', en: 'Gwangju', country: 'KR' },
  { ko: '함부르크', en: 'Hamburg', country: 'DE' },
  { ko: '하노이', en: 'Hanoi', country: 'VN' },
  { ko: '아바나', en: 'Havana', country: 'CU' },
  { ko: '헬싱키', en: 'Helsinki', country: 'FI' },
  { ko: '호찌민', en: 'Ho Chi Minh City', country: 'VN' },
  { ko: '홍콩', en: 'Hong Kong', country: 'HK' },
  { ko: '호놀룰루', en: 'Honolulu', country: 'US' },
  { ko: '휴스턴', en: 'Houston', country: 'US' },
  { ko: '인천', en: 'Incheon', country: 'KR' },
  { ko: '이스탄불', en: 'Istanbul', country: 'TR' },
  { ko: '자카르타', en: 'Jakarta', country: 'ID' },
  { ko: '제주', en: 'Jeju', country: 'KR' },
  { ko: '전주', en: 'Jeonju', country: 'KR' },
  { ko: '예루살렘', en: 'Jerusalem', country: 'IL' },
  { ko: '요하네스버그', en: 'Johannesburg', country: 'ZA' },
  { ko: '크라쿠프', en: 'Krakow', country: 'PL' },
  { ko: '쿠알라룸푸르', en: 'Kuala Lumpur', country: 'MY' },
  { ko: '교토', en: 'Kyoto', country: 'JP' },
  { ko: '라스베이거스', en: 'Las Vegas', country: 'US' },
  { ko: '리마', en: 'Lima', country: 'PE' },
  { ko: '리스본', en: 'Lisbon', country: 'PT' },
  { ko: '런던', en: 'London', country: 'GB' },
  { ko: '로스앤젤레스', en: 'Los Angeles', country: 'US' },
  { ko: '루사일', en: 'Lusail', country: 'QA' },
  { ko: '리옹', en: 'Lyon', country: 'FR' },
  { ko: '마드리드', en: 'Madrid', country: 'ES' },
  { ko: '맨체스터', en: 'Manchester', country: 'GB' },
  { ko: '마닐라', en: 'Manila', country: 'PH' },
  { ko: '마르세유', en: 'Marseille', country: 'FR' },
  { ko: '멜버른', en: 'Melbourne', country: 'AU' },
  { ko: '멕시코시티', en: 'Mexico City', country: 'MX' },
  { ko: '마이애미', en: 'Miami', country: 'US' },
  { ko: '밀라노', en: 'Milan', country: 'IT' },
  { ko: '몬테카를로', en: 'Monte Carlo', country: 'MC' },
  { ko: '몬트리올', en: 'Montreal', country: 'CA' },
  { ko: '몬차', en: 'Monza', country: 'IT' },
  { ko: '모스크바', en: 'Moscow', country: 'RU' },
  { ko: '뭄바이', en: 'Mumbai', country: 'IN' },
  { ko: '뮌헨', en: 'Munich', country: 'DE' },
  { ko: '나고야', en: 'Nagoya', country: 'JP' },
  { ko: '나이로비', en: 'Nairobi', country: 'KE' },
  { ko: '나폴리', en: 'Naples', country: 'IT' },
  { ko: '뉴욕', en: 'New York', country: 'US' },
  { ko: '니스', en: 'Nice', country: 'FR' },
  { ko: '오사카', en: 'Osaka', country: 'JP' },
  { ko: '오슬로', en: 'Oslo', country: 'NO' },
  { ko: '오타와', en: 'Ottawa', country: 'CA' },
  { ko: '파리', en: 'Paris', country: 'FR' },
  { ko: '퍼스', en: 'Perth', country: 'AU' },
  { ko: '필라델피아', en: 'Philadelphia', country: 'US' },
  { ko: '피닉스', en: 'Phoenix', country: 'US' },
  { ko: '포항', en: 'Pohang', country: 'KR' },
  { ko: '포르투', en: 'Porto', country: 'PT' },
  { ko: '프라하', en: 'Prague', country: 'CZ' },
  { ko: '퀘벡', en: 'Quebec City', country: 'CA' },
  { ko: '키토', en: 'Quito', country: 'EC' },
  { ko: '레이캬비크', en: 'Reykjavik', country: 'IS' },
  { ko: '리우데자네이루', en: 'Rio de Janeiro', country: 'BR' },
  { ko: '리야드', en: 'Riyadh', country: 'SA' },
  { ko: '로마', en: 'Rome', country: 'IT' },
  { ko: '샌디에이고', en: 'San Diego', country: 'US' },
  { ko: '샌프란시스코', en: 'San Francisco', country: 'US' },
  { ko: '산티아고', en: 'Santiago', country: 'CL' },
  { ko: '상파울루', en: 'Sao Paulo', country: 'BR' },
  { ko: '삿포로', en: 'Sapporo', country: 'JP' },
  { ko: '시애틀', en: 'Seattle', country: 'US' },
  { ko: '성남', en: 'Seongnam', country: 'KR' },
  { ko: '서울', en: 'Seoul', country: 'KR' },
  { ko: '상하이', en: 'Shanghai', country: 'CN' },
  { ko: '실버스톤', en: 'Silverstone', country: 'GB' },
  { ko: '싱가포르', en: 'Singapore', country: 'SG' },
  { ko: '스파', en: 'Spa', country: 'BE' },
  { ko: '슈필베르크', en: 'Spielberg', country: 'AT' },
  { ko: '스톡홀름', en: 'Stockholm', country: 'SE' },
  { ko: '수원', en: 'Suwon', country: 'KR' },
  { ko: '스즈카', en: 'Suzuka', country: 'JP' },
  { ko: '시드니', en: 'Sydney', country: 'AU' },
  { ko: '타이베이', en: 'Taipei', country: 'TW' },
  { ko: '텔아비브', en: 'Tel Aviv', country: 'IL' },
  { ko: '도쿄', en: 'Tokyo', country: 'JP' },
  { ko: '토론토', en: 'Toronto', country: 'CA' },
  { ko: '툴루즈', en: 'Toulouse', country: 'FR' },
  { ko: '울란바토르', en: 'Ulaanbaatar', country: 'MN' },
  { ko: '울산', en: 'Ulsan', country: 'KR' },
  { ko: '밴쿠버', en: 'Vancouver', country: 'CA' },
  { ko: '베네치아', en: 'Venice', country: 'IT' },
  { ko: '빈', en: 'Vienna', country: 'AT' },
  { ko: '바르샤바', en: 'Warsaw', country: 'PL' },
  { ko: '워싱턴', en: 'Washington', country: 'US' },
  { ko: '웰링턴', en: 'Wellington', country: 'NZ' },
  { ko: '여수', en: 'Yeosu', country: 'KR' },
  { ko: '요코하마', en: 'Yokohama', country: 'JP' },
  { ko: '용인', en: 'Yongin', country: 'KR' },
  { ko: '잔드보르트', en: 'Zandvoort', country: 'NL' },
  { ko: '취리히', en: 'Zurich', country: 'CH' },
]

const norm = (s) => (s ?? '').toLowerCase().replace(/\s+/g, '')

/**
 * 접두어로만 매칭하고 영문명 알파벳 순으로 정렬한다.
 * 'a' → a로 시작하는 도시 전부, 'ab' → ab로 시작하는 도시 전부.
 * 한글로 입력해도 동일하게 접두어 매칭된다.
 */
export const searchLocalCities = (query, limit = 12) => {
  const q = norm(query)
  if (!q) return []

  return CITY_INDEX.filter((c) => norm(c.ko).startsWith(q) || norm(c.en).startsWith(q))
    .sort((a, b) => a.en.localeCompare(b.en, 'en'))
    .slice(0, limit)
    .map((c) => ({
      name: c.en, // API 조회에 쓰는 실제 키
      country: c.country,
      state: '',
      label: `${c.ko} · ${c.en}, ${c.country}`,
      local: true,
    }))
}

/** 한글이 포함되어 있는지 */
export const hasHangul = (s) => /[ㄱ-ㅎ가-힣]/.test(s ?? '')

/**
 * 사용자가 입력한 도시명을 API 조회용 영문명으로 해석한다.
 *
 * OpenWeatherMap은 한글 도시명을 인식하지 못하므로, 자동완성에서 고르지 않고
 * '대구'처럼 직접 입력한 뒤 Enter를 치면 404가 난다.
 * 색인에 완전 일치하는 항목이 있으면 영문명으로 바꿔준다.
 * (접두어 일치는 쓰지 않는다 — '대'가 Daegu로 단정되면 오히려 틀린 결과가 된다)
 *
 * @returns {{ query: string, resolved: boolean }}
 */
export const resolveCityName = (input) => {
  const raw = (input ?? '').trim()
  const q = norm(raw)
  if (!q) return { query: raw, resolved: false }

  const hit = CITY_INDEX.find((c) => norm(c.ko) === q || norm(c.en) === q)
  return hit ? { query: hit.en, resolved: true } : { query: raw, resolved: false }
}

/**
 * 카드 목록 필터링용 매칭.
 * 카드에 담긴 도시명은 영문이지만, 사용자는 한글로 칠 수 있다.
 * 색인을 통해 영문명 ↔ 한글명을 이어 붙여 양쪽 모두로 걸러지게 한다.
 */
export const cityMatchesQuery = (cityName, query) => {
  const q = norm(query)
  if (!q) return true
  const en = norm(cityName)
  if (en.includes(q)) return true

  const entry = CITY_INDEX.find((c) => norm(c.en) === en)
  return entry ? norm(entry.ko).includes(q) : false
}

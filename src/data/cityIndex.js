/**
 * 자주 찾는 도시 색인.
 *
 * OpenWeatherMap의 /geo/1.0/direct는 접두어 자동완성용 API가 아니라 이름 근사 매칭이고
 * limit이 최대 5라, 'Dae'를 치면 Daye·Dae 같은 소도시가 먼저 잡혀 대구·대전이 밀려난다.
 * 게다가 한글 입력은 아예 매칭되지 않는다.
 *
 * 그래서 자주 쓰이는 도시는 로컬에서 먼저 접두어 매칭하고, 그 뒤에 API 결과를 덧붙인다.
 * ko는 한글 검색어와 표시용, en은 실제 API 조회에 쓰는 키다.
 */
export const CITY_INDEX = [
  // 대한민국
  { ko: '서울', en: 'Seoul', country: 'KR' },
  { ko: '부산', en: 'Busan', country: 'KR' },
  { ko: '대구', en: 'Daegu', country: 'KR' },
  { ko: '대전', en: 'Daejeon', country: 'KR' },
  { ko: '인천', en: 'Incheon', country: 'KR' },
  { ko: '광주', en: 'Gwangju', country: 'KR' },
  { ko: '울산', en: 'Ulsan', country: 'KR' },
  { ko: '수원', en: 'Suwon', country: 'KR' },
  { ko: '성남', en: 'Seongnam', country: 'KR' },
  { ko: '용인', en: 'Yongin', country: 'KR' },
  { ko: '고양', en: 'Goyang', country: 'KR' },
  { ko: '창원', en: 'Changwon', country: 'KR' },
  { ko: '청주', en: 'Cheongju', country: 'KR' },
  { ko: '전주', en: 'Jeonju', country: 'KR' },
  { ko: '천안', en: 'Cheonan', country: 'KR' },
  { ko: '포항', en: 'Pohang', country: 'KR' },
  { ko: '제주', en: 'Jeju', country: 'KR' },
  { ko: '강릉', en: 'Gangneung', country: 'KR' },
  { ko: '춘천', en: 'Chuncheon', country: 'KR' },
  { ko: '여수', en: 'Yeosu', country: 'KR' },

  // F1 2026 개최지 (서킷 소재 도시)
  { ko: '멜버른', en: 'Melbourne', country: 'AU' },
  { ko: '상하이', en: 'Shanghai', country: 'CN' },
  { ko: '스즈카', en: 'Suzuka', country: 'JP' },
  { ko: '마이애미', en: 'Miami', country: 'US' },
  { ko: '몬트리올', en: 'Montreal', country: 'CA' },
  { ko: '몬테카를로', en: 'Monte Carlo', country: 'MC' },
  { ko: '바르셀로나', en: 'Barcelona', country: 'ES' },
  { ko: '슈필베르크', en: 'Spielberg', country: 'AT' },
  { ko: '실버스톤', en: 'Silverstone', country: 'GB' },
  { ko: '스파', en: 'Spa', country: 'BE' },
  { ko: '부다페스트', en: 'Budapest', country: 'HU' },
  { ko: '잔드보르트', en: 'Zandvoort', country: 'NL' },
  { ko: '몬차', en: 'Monza', country: 'IT' },
  { ko: '마드리드', en: 'Madrid', country: 'ES' },
  { ko: '바쿠', en: 'Baku', country: 'AZ' },
  { ko: '싱가포르', en: 'Singapore', country: 'SG' },
  { ko: '오스틴', en: 'Austin', country: 'US' },
  { ko: '멕시코시티', en: 'Mexico City', country: 'MX' },
  { ko: '상파울루', en: 'Sao Paulo', country: 'BR' },
  { ko: '라스베이거스', en: 'Las Vegas', country: 'US' },
  { ko: '루사일', en: 'Lusail', country: 'QA' },
  { ko: '아부다비', en: 'Abu Dhabi', country: 'AE' },

  // 세계 주요 도시
  { ko: '도쿄', en: 'Tokyo', country: 'JP' },
  { ko: '오사카', en: 'Osaka', country: 'JP' },
  { ko: '삿포로', en: 'Sapporo', country: 'JP' },
  { ko: '후쿠오카', en: 'Fukuoka', country: 'JP' },
  { ko: '베이징', en: 'Beijing', country: 'CN' },
  { ko: '홍콩', en: 'Hong Kong', country: 'HK' },
  { ko: '타이베이', en: 'Taipei', country: 'TW' },
  { ko: '방콕', en: 'Bangkok', country: 'TH' },
  { ko: '하노이', en: 'Hanoi', country: 'VN' },
  { ko: '자카르타', en: 'Jakarta', country: 'ID' },
  { ko: '마닐라', en: 'Manila', country: 'PH' },
  { ko: '델리', en: 'Delhi', country: 'IN' },
  { ko: '두바이', en: 'Dubai', country: 'AE' },
  { ko: '이스탄불', en: 'Istanbul', country: 'TR' },
  { ko: '런던', en: 'London', country: 'GB' },
  { ko: '파리', en: 'Paris', country: 'FR' },
  { ko: '베를린', en: 'Berlin', country: 'DE' },
  { ko: '뮌헨', en: 'Munich', country: 'DE' },
  { ko: '로마', en: 'Rome', country: 'IT' },
  { ko: '밀라노', en: 'Milan', country: 'IT' },
  { ko: '마드리드시', en: 'Madrid', country: 'ES' },
  { ko: '암스테르담', en: 'Amsterdam', country: 'NL' },
  { ko: '취리히', en: 'Zurich', country: 'CH' },
  { ko: '빈', en: 'Vienna', country: 'AT' },
  { ko: '프라하', en: 'Prague', country: 'CZ' },
  { ko: '스톡홀름', en: 'Stockholm', country: 'SE' },
  { ko: '헬싱키', en: 'Helsinki', country: 'FI' },
  { ko: '모스크바', en: 'Moscow', country: 'RU' },
  { ko: '뉴욕', en: 'New York', country: 'US' },
  { ko: '로스앤젤레스', en: 'Los Angeles', country: 'US' },
  { ko: '샌프란시스코', en: 'San Francisco', country: 'US' },
  { ko: '시카고', en: 'Chicago', country: 'US' },
  { ko: '시애틀', en: 'Seattle', country: 'US' },
  { ko: '토론토', en: 'Toronto', country: 'CA' },
  { ko: '밴쿠버', en: 'Vancouver', country: 'CA' },
  { ko: '시드니', en: 'Sydney', country: 'AU' },
  { ko: '오클랜드', en: 'Auckland', country: 'NZ' },
  { ko: '카이로', en: 'Cairo', country: 'EG' },
  { ko: '케이프타운', en: 'Cape Town', country: 'ZA' },
  { ko: '부에노스아이레스', en: 'Buenos Aires', country: 'AR' },
]

const norm = (s) => (s ?? '').toLowerCase().replace(/\s+/g, '')

/**
 * 로컬 색인에서 접두어 우선으로 매칭한다.
 * 한글/영문 어느 쪽으로 쳐도 잡히며, 접두어 일치를 부분 일치보다 앞에 둔다.
 */
export const searchLocalCities = (query, limit = 6) => {
  const q = norm(query)
  if (!q) return []

  const scored = []
  for (const c of CITY_INDEX) {
    const ko = norm(c.ko)
    const en = norm(c.en)
    let score = null
    if (ko === q || en === q)
      score = 0 // 완전 일치
    else if (ko.startsWith(q) || en.startsWith(q))
      score = 1 // 접두어 일치
    else if (ko.includes(q) || en.includes(q)) score = 2 // 부분 일치
    if (score !== null) scored.push({ ...c, score })
  }

  return scored
    .sort((a, b) => a.score - b.score || a.en.length - b.en.length)
    .slice(0, limit)
    .map((c) => ({
      name: c.en, // API 조회에 쓰는 실제 키
      country: c.country,
      state: '',
      label: `${c.ko} · ${c.en}, ${c.country}`,
      local: true,
    }))
}

/**
 * 브라우저 Geolocation API를 Promise로 감싼 헬퍼.
 * 권한 거부/미지원/타임아웃을 사용자 친화적 한글 메시지로 변환한다.
 */
export const getCurrentPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (err) => {
        const messages = {
          1: '위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
          2: '현재 위치를 확인할 수 없습니다.',
          3: '위치 확인 시간이 초과되었습니다.',
        }
        reject(new Error(messages[err.code] ?? '위치 정보를 가져오지 못했습니다.'))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000, ...options },
    )
  })

// OpenWeatherMap icon code -> 이모지/설명 매핑 (외부 이미지 의존 없이 가볍게 표현)
const ICON_MAP = {
  '01d': '☀️',
  '01n': '🌙',
  '02d': '⛅',
  '02n': '☁️',
  '03d': '☁️',
  '03n': '☁️',
  '04d': '☁️',
  '04n': '☁️',
  '09d': '🌧️',
  '09n': '🌧️',
  '10d': '🌦️',
  '10n': '🌧️',
  '11d': '⛈️',
  '11n': '⛈️',
  '13d': '❄️',
  '13n': '❄️',
  '50d': '🌫️',
  '50n': '🌫️',
}

export const iconEmoji = (code) => ICON_MAP[code] ?? '🌡️'

export const iconUrl = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`

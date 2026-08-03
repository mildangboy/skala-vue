<script setup>
/**
 * Liquid Glass 굴절 필터.
 *
 * 유리 가장자리에서 배경이 휘어 보이는 효과는 feDisplacementMap으로 만든다.
 * 다만 SVG 필터를 backdrop-filter로 쓰는 건 현재 Chromium만 지원하므로,
 * 지원 여부를 감지해 <html>에 클래스를 붙이고 CSS가 알아서 갈라지게 한다.
 * (미지원 브라우저는 하이라이트 중심의 유리로 자연스럽게 대체된다)
 */
import { onMounted } from 'vue'

const supportsSvgBackdrop = () => {
  if (typeof CSS === 'undefined' || !CSS.supports) return false
  // url() 참조를 backdrop-filter로 받아주는지 확인
  return CSS.supports('backdrop-filter', 'url(#x)')
}

onMounted(() => {
  document.documentElement.classList.toggle('glass-refraction', supportsSvgBackdrop())
})
</script>

<template>
  <!-- 화면에 그려지지 않는 필터 정의 전용 SVG -->
  <svg class="glass-filters" aria-hidden="true" focusable="false">
    <defs>
      <!-- 가장자리로 갈수록 강해지는 변위 맵.
           가운데는 왜곡이 없고 테두리 근처만 배경이 휘도록 방사형으로 구성 -->
      <radialGradient id="glass-edge-map" cx="50%" cy="50%" r="50%">
        <stop offset="55%" stop-color="#808080" />
        <stop offset="88%" stop-color="#b4b4ff" />
        <stop offset="100%" stop-color="#ffffff" />
      </radialGradient>

      <filter id="glass-refract" x="-12%" y="-12%" width="124%" height="124%">
        <!-- 변위에 쓸 이미지: 위 그라디언트를 필터 영역에 채운다 -->
        <feImage
          href="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='55%25' stop-color='%23808080'/%3E%3Cstop offset='88%25' stop-color='%23b4b4ff'/%3E%3Cstop offset='100%25' stop-color='%23ffffff'/%3E%3C/radialGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E"
          result="edgeMap"
          preserveAspectRatio="none"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="edgeMap"
          scale="14"
          xChannelSelector="R"
          yChannelSelector="B"
          result="refracted"
        />
        <!-- 굴절된 배경을 살짝 부드럽게 눌러 거친 픽셀을 정리 -->
        <feGaussianBlur in="refracted" stdDeviation="0.4" />
      </filter>
    </defs>
  </svg>
</template>

<style scoped>
.glass-filters {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>

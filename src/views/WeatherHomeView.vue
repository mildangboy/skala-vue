<script setup>
import WeatherParent from '@/components/WeatherParent.vue'
</script>

<template>
  <div class="home-view">
    <section class="home-view__intro">
      <h1>오늘의 날씨를 한눈에</h1>
      <p>도시를 검색하고 즐겨찾기에 추가하면 대시보드에 고정됩니다.</p>
    </section>
    <WeatherParent />
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.home-view__intro h1 {
  font-size: 28px;
  margin: 0 0 6px;
}
.home-view__intro p {
  margin: 0;
  color: var(--text-muted);
}
</style>

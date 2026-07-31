<script setup>
// el-skeleton 대신 테마 변수와 완전히 맞물리는 자체 스켈레톤 (다크모드 대응)
defineProps({
  lines: { type: Number, default: 3 },
  height: { type: String, default: '150px' },
})
</script>

<template>
  <div class="skeleton" :style="{ minHeight: height }">
    <div class="skeleton__bar skeleton__bar--title" />
    <div v-for="n in lines" :key="n" class="skeleton__bar" :style="{ width: `${90 - n * 14}%` }" />
  </div>
</template>

<style scoped>
.skeleton {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton__bar {
  height: 12px;
  width: 70%;
  border-radius: var(--radius-pill);
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 25%,
    var(--skeleton-shine) 37%,
    var(--skeleton-base) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
.skeleton__bar--title {
  height: 26px;
  width: 55%;
}
@keyframes shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>

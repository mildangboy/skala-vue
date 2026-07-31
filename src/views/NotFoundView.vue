<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="not-found__code">404</div>
    <h1>페이지를 찾을 수 없습니다</h1>
    <p>요청하신 주소가 변경되었거나 존재하지 않습니다.</p>
    <div class="not-found__actions">
      <el-button type="primary" round @click="router.push({ name: 'weather-home' })">
        홈으로 이동
      </el-button>
      <el-button round text @click="router.back()">이전 페이지</el-button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 70px 20px;
}
.not-found__code {
  font-size: clamp(72px, 16vw, 130px);
  font-weight: 200;
  letter-spacing: -0.05em;
  line-height: 1;
  background: linear-gradient(135deg, var(--amg-teal), var(--amg-silver));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.not-found h1 {
  margin: 14px 0 6px;
  font-size: 22px;
}
.not-found p {
  margin: 0 0 22px;
  color: var(--text-muted);
  font-size: 14px;
}
.not-found__actions {
  display: flex;
  gap: 8px;
}
</style>

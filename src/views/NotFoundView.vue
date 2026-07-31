<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found">
    <el-result icon="warning" title="404" sub-title="요청하신 페이지를 찾을 수 없습니다.">
      <template #extra>
        <el-button type="primary" @click="router.push('/')">홈으로 이동</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  padding-top: 40px;
}
</style>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { hasApiKey, setApiKey } from '@/api/client'

const emit = defineEmits(['saved'])
const visible = ref(!hasApiKey())
const input = ref('')

const save = () => {
  const key = input.value.trim()
  if (key.length < 20) {
    ElMessage.warning('올바른 API 키 형식이 아닙니다.')
    return
  }
  setApiKey(key)
  visible.value = false
  ElMessage.success('API 키가 저장되었습니다. 날씨를 불러옵니다.')
  emit('saved')
}
</script>

<template>
  <div v-if="visible" class="api-gate">
    <div class="api-gate__head">
      <strong>OpenWeatherMap API 키를 입력하세요</strong>
      <span>
        키는 이 브라우저에만 저장되며 어디에도 전송되지 않습니다. F1 일정과 카운트다운은 키 없이도
        동작합니다.
      </span>
    </div>
    <div class="api-gate__form">
      <el-input v-model="input" placeholder="API 키 붙여넣기" size="large" @keyup.enter="save" />
      <el-button type="primary" size="large" @click="save">저장</el-button>
    </div>
    <a href="https://home.openweathermap.org/api_keys" target="_blank" rel="noopener">
      키 발급받기 →
    </a>
  </div>
</template>

<style scoped>
.api-gate {
  padding: 18px 20px;
  border-radius: var(--radius-card);
  border: 1px solid color-mix(in srgb, var(--accent) 34%, transparent);
  background: linear-gradient(135deg, var(--accent-soft), transparent 60%), var(--surface);
  backdrop-filter: var(--blur-glass);
}
.api-gate__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.api-gate__head strong {
  font-size: 15px;
}
.api-gate__head span {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}
.api-gate__form {
  display: flex;
  gap: 8px;
}
.api-gate__form :deep(.el-input__wrapper) {
  border-radius: var(--radius-pill);
}
.api-gate a {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
}
</style>

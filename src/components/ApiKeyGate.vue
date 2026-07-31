<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, CircleCheck } from '@element-plus/icons-vue'
import { hasApiKey, setApiKey } from '@/api/client'
import { verifyApiKey } from '@/api/weather'

const emit = defineEmits(['saved'])

const visible = ref(!hasApiKey())
const formRef = ref(null)
const verifying = ref(false)
const form = reactive({ apiKey: '', agree: false })

// 비동기 validator — 형식만 보는 게 아니라 실제 API를 호출해 키가 살아있는지 확인한다.
const validateKey = async (rule, value, callback) => {
  const key = (value ?? '').trim()
  if (!key) return callback(new Error('API 키를 입력해주세요.'))
  if (!/^[a-f0-9]{32}$/i.test(key)) {
    return callback(new Error('OpenWeatherMap 키는 32자리 16진수 형식입니다.'))
  }
  verifying.value = true
  try {
    await verifyApiKey(key)
    callback()
  } catch (err) {
    callback(new Error(err.message))
  } finally {
    verifying.value = false
  }
}

const rules = {
  apiKey: [{ validator: validateKey, trigger: 'blur' }],
  agree: [
    {
      validator: (rule, value, callback) =>
        value ? callback() : callback(new Error('키를 브라우저에 저장하려면 동의가 필요합니다.')),
      trigger: 'change',
    },
  ],
}

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return // 검증 실패 시 el-form이 각 항목에 메시지를 표시한다
  }
  setApiKey(form.apiKey)
  visible.value = false
  ElMessage.success({ message: '키가 확인되었습니다. 날씨를 불러옵니다.', duration: 2200 })
  emit('saved')
}
</script>

<template>
  <el-form
    v-if="visible"
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    class="api-gate"
    @submit.prevent="submit"
  >
    <header class="api-gate__head">
      <strong
        ><el-icon><Key /></el-icon> OpenWeatherMap API 키 등록</strong
      >
      <span>
        입력한 키는 이 브라우저에만 저장되며 외부로 전송되지 않습니다. 저장 전에 실제 API를 호출해
        유효성을 확인합니다. F1 일정과 카운트다운은 키 없이도 동작합니다.
      </span>
    </header>

    <el-form-item prop="apiKey" label="API 키">
      <el-input
        v-model.trim="form.apiKey"
        placeholder="32자리 키를 붙여넣으세요"
        size="large"
        clearable
        show-password
        :suffix-icon="verifying ? '' : CircleCheck"
        @keyup.enter="submit"
      />
    </el-form-item>

    <el-form-item prop="agree">
      <el-switch v-model="form.agree" />
      <span class="api-gate__agree">키를 이 브라우저에 저장하는 데 동의합니다.</span>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" size="large" :loading="verifying" @click="submit">
        {{ verifying ? '키 확인 중…' : '검증 후 저장' }}
      </el-button>
      <a
        class="api-gate__link"
        href="https://home.openweathermap.org/api_keys"
        target="_blank"
        rel="noopener"
      >
        키 발급받기 →
      </a>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.api-gate {
  padding: 20px 22px 6px;
  border-radius: var(--radius-card);
  border: 1px solid color-mix(in srgb, var(--accent) 34%, transparent);
  background: linear-gradient(135deg, var(--accent-soft), transparent 60%), var(--surface);
  backdrop-filter: var(--blur-glass);
}
.api-gate__head {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 14px;
}
.api-gate__head strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}
.api-gate__head span {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.65;
}
.api-gate__agree {
  margin-left: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.api-gate__link {
  margin-left: 12px;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
}
.api-gate :deep(.el-form-item__label) {
  font-size: 12px;
  color: var(--text-muted);
  padding-bottom: 4px;
}
</style>

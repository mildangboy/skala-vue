<script setup>
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'

/**
 * 관전 플랜은 공개 링크로 열리므로, 로그인한 사람이 자기 플랜만 다루도록 막는다.
 * 알림 메일도 계정에 등록된 주소로만 나간다.
 */
const auth = useAuthStore()
const { user, busy, isSignedIn, ready, configured } = storeToRefs(auth)

const signIn = async () => {
  try {
    await auth.login()
    ElMessage.success({ message: '로그인되었습니다.', duration: 1800 })
  } catch (err) {
    ElMessage.error(err.message)
  }
}

const signOut = async () => {
  await auth.logout()
  ElMessage.success({ message: '로그아웃되었습니다.', duration: 1600 })
}
</script>

<template>
  <!-- 설정이 없으면 안내만 -->
  <el-alert
    v-if="!configured"
    type="info"
    show-icon
    :closable="false"
    title="구글 로그인이 설정되지 않았습니다"
    description="플랜은 이 기기에만 저장되고 알림 메일은 발송되지 않습니다. functions/README.md를 참고해 설정해주세요."
  />

  <!-- 로그인 후: 계정 요약 -->
  <div v-else-if="isSignedIn" class="account liquid-glass">
    <img
      v-if="user.photoURL"
      :src="user.photoURL"
      :alt="user.displayName"
      class="account__avatar"
    />
    <div class="account__meta">
      <strong>{{ user.displayName }}</strong>
      <span>{{ user.email }}</span>
    </div>
    <el-button text size="small" :loading="busy" @click="signOut">로그아웃</el-button>
  </div>

  <!-- 로그인 전: 안내와 버튼 -->
  <div v-else-if="ready" class="signin liquid-glass">
    <div class="signin__text">
      <strong>구글 계정으로 로그인해주세요</strong>
      <span>
        본인이 만든 플랜만 보이고 수정할 수 있습니다. 알림 메일은 로그인한 계정 주소로만 발송되므로
        다른 사람의 주소로는 보낼 수 없습니다.
      </span>
    </div>
    <el-button type="primary" round :loading="busy" @click="signIn">구글로 로그인</el-button>
  </div>
</template>

<style scoped>
.account,
.signin {
  border-radius: var(--radius-card);
  padding: 16px 20px;
}
.account {
  display: flex;
  align-items: center;
  gap: 12px;
}
.account__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--surface-border);
}
.account__meta {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  margin-right: auto;
}
.account__meta strong {
  font-size: 14px;
}
.account__meta span {
  font-size: 12px;
  color: var(--text-muted);
}
.signin {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.signin__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 240px;
}
.signin__text strong {
  font-size: 15px;
}
.signin__text span {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.65;
}
</style>

<script setup>
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

/**
 * 관전 플랜은 공개 링크로 열리므로, 로그인한 사람이 자기 플랜만 다루도록 막는다.
 * 알림 메일도 계정에 등록된 주소로만 나간다.
 *
 * 로그인 버튼 자체는 헤더(AuthMenu)에 있고, 여기서는 상태만 알린다.
 */
const auth = useAuthStore()
const { user, isSignedIn, ready, configured } = storeToRefs(auth)
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
    <span class="account__badge">수정·삭제는 내 플랜만</span>
  </div>

  <!-- 로그인 전: 헤더의 로그인 버튼으로 안내 -->
  <el-alert
    v-else-if="ready"
    type="warning"
    show-icon
    :closable="false"
    title="오른쪽 위 '로그인'을 눌러 구글 계정으로 로그인해주세요"
    description="본인이 만든 플랜만 보이고 수정할 수 있습니다. 알림 메일은 로그인한 계정 주소로만 발송되므로 다른 사람의 주소로는 보낼 수 없습니다."
  />
</template>

<style scoped>
.account {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: var(--radius-card);
  padding: 16px 20px;
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
.account__badge {
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>

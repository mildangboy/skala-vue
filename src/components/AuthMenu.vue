<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'

/**
 * 헤더의 로그인 영역.
 *
 * 로그인 전에는 앱 테마의 "로그인" 버튼을 두고, 누르면 작은 창을 연다.
 * 구글 버튼은 그 창 안에 둔다 — 구글 버튼은 cross-origin iframe이라
 * 배경(흰색)을 바꿀 수 없고 계정 상태에 따라 크기도 달라져,
 * 어두운 화면 위에 그대로 두면 흰 상자처럼 떠 보이기 때문이다.
 * 창 배경을 밝게 두면 구글 버튼이 원래 있어야 할 자리에 놓인 것처럼 보인다.
 */
const auth = useAuthStore()
const { user, busy, isSignedIn, ready, configured } = storeToRefs(auth)

const dialogOpen = ref(false)
const gbtn = ref(null)
const fallback = ref(false)

const initial = computed(() => (user.value?.displayName ?? user.value?.email ?? '?').charAt(0))

/** 창이 열린 뒤에야 버튼 자리가 생기므로 그때 붙인다 */
const mountButton = async () => {
  await nextTick()
  const box = gbtn.value
  if (!box) {
    fallback.value = true
    return
  }
  try {
    await auth.mountGoogleButton(box)
    dialogOpen.value = false
    ElMessage.success({ message: '로그인되었습니다.', duration: 1800 })
  } catch (err) {
    if (err?.message?.includes('취소')) return // 창을 닫은 경우
    fallback.value = true
    ElMessage.error(err.message)
  }
}

watch(dialogOpen, (open) => {
  if (open) mountButton()
})

/** 구글 버튼이 뜨지 않는 환경을 위한 보조 경로 */
const signInFallback = async () => {
  try {
    await auth.login()
    dialogOpen.value = false
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
  <!-- 설정이 없으면 로그인 자체를 노출하지 않는다 -->
  <div v-if="configured && ready" class="auth">
    <!-- 로그인 후: 아바타 + 계정 메뉴 -->
    <el-dropdown v-if="isSignedIn" trigger="click" placement="bottom-end">
      <button type="button" class="auth__avatar" :title="user.email">
        <img v-if="user.photoURL" :src="user.photoURL" :alt="user.displayName" />
        <span v-else>{{ initial }}</span>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <div class="auth__account">
            <strong>{{ user.displayName }}</strong>
            <span>{{ user.email }}</span>
          </div>
          <el-dropdown-item divided :disabled="busy" @click="signOut">로그아웃</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 로그인 전: 앱 테마의 버튼 -->
    <button v-else type="button" class="auth__signin" @click="dialogOpen = true">로그인</button>
  </div>

  <el-dialog
    v-model="dialogOpen"
    title="로그인"
    width="380px"
    align-center
    append-to-body
    class="auth-dialog"
  >
    <p class="auth-dialog__lead">
      구글 계정으로 로그인하면 본인이 만든 관전 플랜만 보이고 수정할 수 있습니다. 알림 메일도
      로그인한 계정 주소로만 발송됩니다.
    </p>

    <!-- 구글 버튼은 이 밝은 판 위에 둔다 -->
    <div class="auth-dialog__plate">
      <div ref="gbtn"></div>
    </div>

    <el-button v-if="fallback" type="primary" round :loading="busy" @click="signInFallback">
      다른 방법으로 로그인
    </el-button>
  </el-dialog>
</template>

<style scoped>
.auth {
  display: flex;
  align-items: center;
}

.auth__signin {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.auth__signin:hover {
  background: var(--accent);
  color: var(--on-accent-text, #06201c);
}

.auth__avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease;
}
.auth__avatar:hover {
  border-color: var(--accent);
}
.auth__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth__account {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 16px 4px;
  line-height: 1.35;
}
.auth__account strong {
  font-size: 13px;
  color: var(--text-primary);
}
.auth__account span {
  font-size: 11px;
  color: var(--text-muted);
}

.auth-dialog__lead {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/*
 * 구글 버튼은 흰 배경을 함께 그린다. 그 위에 밝은 판을 깔아두면
 * 흰 여백이 판과 이어져 보여 따로 손대지 않아도 자연스럽다.
 */
.auth-dialog__plate {
  display: flex;
  justify-content: center;
  padding: 18px;
  border-radius: var(--radius-card, 16px);
  background: #ffffff;
  border: 1px solid rgba(10, 10, 10, 0.08);
}
</style>

// Element Plus 기본 스타일을 먼저 로드한 뒤 프로젝트 스타일을 얹는다.
// 순서가 반대면 같은 특이성의 오버라이드(.el-button--primary 등)가 무시된다.
import 'element-plus/dist/index.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')

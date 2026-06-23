import { createApp } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"
import i18n from "./i18n"
import { router } from "./router"
import { useAuthStore } from "./stores/auth"
import { useUiLocaleStore } from "./stores/uiLocale"
import "./styles/app.css"

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

const authStore = useAuthStore(pinia)
authStore.hydrate()
void authStore.refreshSession()
const uiLocaleStore = useUiLocaleStore(pinia)
uiLocaleStore.hydrate()
i18n.global.locale.value = uiLocaleStore.locale
uiLocaleStore.$subscribe((_mutation, state) => {
  i18n.global.locale.value = state.locale
})

app.mount("#app")

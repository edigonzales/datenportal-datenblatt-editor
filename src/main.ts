import { createApp } from "vue";
import { createPinia } from "pinia";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App.vue";
import { router } from "./app/router";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/utilities.css";
import "bootstrap-icons/font/bootstrap-icons.css";

registerSW({ immediate: true });

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

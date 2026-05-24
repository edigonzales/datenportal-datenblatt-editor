import { createRouter, createWebHistory } from "vue-router";
import StartPage from "../components/StartPage.vue";
import DatasetEditor from "../components/DatasetEditor.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "start", component: StartPage, meta: { tab: "start" } },
    {
      path: "/draft/:id",
      name: "draft",
      component: DatasetEditor,
      props: { tab: "dataset" },
      meta: { tab: "dataset" }
    },
    {
      path: "/draft/:id/attributes",
      name: "draft-attributes",
      component: DatasetEditor,
      props: { tab: "attributes" },
      meta: { tab: "attributes" }
    },
    {
      path: "/draft/:id/json",
      name: "draft-json",
      component: DatasetEditor,
      props: { tab: "json" },
      meta: { tab: "json" }
    }
  ]
});

<script setup lang="ts">
import type { ContactPoint } from "../domain/datasetTypes";

defineProps<{
  contactPoint: ContactPoint;
}>();
</script>

<template>
  <div class="field-grid">
    <div class="inline-grid">
      <div class="field-row">
        <label for="contact-name">Name</label>
        <input id="contact-name" v-model="contactPoint.name" class="text-input" type="text" />
      </div>
      <div class="field-row">
        <label for="contact-organization">Organisationseinheit</label>
        <input id="contact-organization" v-model="contactPoint.organizationUnit" class="text-input" type="text" />
      </div>
    </div>
    <div class="inline-grid">
      <div class="field-row">
        <label for="contact-email">E-Mail *</label>
        <input id="contact-email" v-model="contactPoint.email" class="text-input" type="email" />
      </div>
      <div class="field-row">
        <label for="contact-phone">Telefon</label>
        <input id="contact-phone" v-model="contactPoint.phone" class="text-input" type="text" />
      </div>
    </div>
    <div class="field-row">
      <label for="contact-url">URL</label>
      <input id="contact-url" v-model="contactPoint.url" class="text-input" type="url" />
    </div>
  </div>
</template>

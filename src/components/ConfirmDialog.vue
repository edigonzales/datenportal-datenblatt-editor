<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog dialog--narrow">
      <div class="dialog-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
      </div>
      <div class="action-row">
        <button class="button" type="button" @click="emit('close')">{{ cancelLabel ?? "Abbrechen" }}</button>
        <button class="button button--primary" type="button" @click="emit('confirm')">
          {{ confirmLabel ?? "Bestätigen" }}
        </button>
      </div>
    </div>
  </div>
</template>

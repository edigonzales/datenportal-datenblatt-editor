<script setup lang="ts">
import type { DatasetAttribute } from "../domain/datasetTypes";
import { attributeDataTypeOptions } from "../config/vocabularies";

const props = defineProps<{
  attributes: DatasetAttribute[];
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}>();

function addAttribute(): void {
  props.attributes.push({
    name: "",
    dataType: "",
    description: "",
    unit: "",
    codeList: "",
    mandatory: false
  });
}

function duplicateAttribute(index: number): void {
  const copy = JSON.parse(JSON.stringify(props.attributes[index])) as DatasetAttribute;
  props.attributes.splice(index + 1, 0, copy);
}

function deleteAttribute(index: number): void {
  props.attributes.splice(index, 1);
}

function move(index: number, direction: -1 | 1): void {
  const target = index + direction;
  if (target < 0 || target >= props.attributes.length) {
    return;
  }
  const [entry] = props.attributes.splice(index, 1);
  props.attributes.splice(target, 0, entry);
}
</script>

<template>
  <section class="surface surface--editor section-stack">
    <div class="header-line">
      <div>
        <h2>{{ title || "Attribute" }}</h2>
        <p class="muted">{{ description || "Einfache, lokal editierbare Attributliste ohne CSV-Analyse." }}</p>
      </div>
      <button class="button button--primary" type="button" @click="addAttribute">Attribut hinzufügen</button>
    </div>

    <div v-if="attributes.length" class="table-wrap">
      <table class="table attribute-table">
        <colgroup>
          <col class="attribute-table__col-name" />
          <col class="attribute-table__col-type" />
          <col class="attribute-table__col-description" />
          <col class="attribute-table__col-unit" />
          <col class="attribute-table__col-code-list" />
          <col class="attribute-table__col-mandatory" />
          <col class="attribute-table__col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Typ</th>
            <th>Beschreibung</th>
            <th>Einheit</th>
            <th>CodeList</th>
            <th>Pflicht</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(attribute, index) in attributes" :key="index">
            <td><input v-model="attribute.name" class="text-input attribute-table__input" type="text" /></td>
            <td>
              <select v-model="attribute.dataType" class="select attribute-table__input">
                <option value="">Bitte wählen</option>
                <option v-for="option in attributeDataTypeOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </td>
            <td><textarea v-model="attribute.description" class="textarea attribute-table__textarea" rows="2" /></td>
            <td><input v-model="attribute.unit" class="text-input attribute-table__input" type="text" /></td>
            <td><input v-model="attribute.codeList" class="text-input attribute-table__input" type="text" /></td>
            <td>
              <label class="checkbox-item">
                <input v-model="attribute.mandatory" type="checkbox" />
                <span>Ja</span>
              </label>
            </td>
            <td>
              <div class="attribute-actions">
                <button
                  class="button button--icon"
                  type="button"
                  aria-label="Nach oben"
                  title="Nach oben"
                  :disabled="index === 0"
                  @click="move(index, -1)"
                >
                  <i class="bi bi-arrow-up" aria-hidden="true"></i>
                </button>
                <button
                  class="button button--icon"
                  type="button"
                  aria-label="Nach unten"
                  title="Nach unten"
                  :disabled="index === attributes.length - 1"
                  @click="move(index, 1)"
                >
                  <i class="bi bi-arrow-down" aria-hidden="true"></i>
                </button>
                <button
                  class="button button--icon"
                  type="button"
                  aria-label="Duplizieren"
                  title="Duplizieren"
                  @click="duplicateAttribute(index)"
                >
                  <i class="bi bi-files" aria-hidden="true"></i>
                </button>
                <button
                  class="button button--icon button--danger"
                  type="button"
                  aria-label="Löschen"
                  title="Löschen"
                  @click="deleteAttribute(index)"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state" style="padding: 24px">
      <h3>{{ emptyTitle || "Noch keine Attribute" }}</h3>
      <p>{{ emptyMessage || "Fügen Sie einzelne Attribute manuell hinzu. Eine CSV-Analyse ist im MVP nicht enthalten." }}</p>
    </div>
  </section>
</template>

<template>
  <div>
    <label :class="getLabelClass(item)">
      <input
        v-if="item == question.selectAllItem"
        type="checkbox"
        :name="question.name"
        :value="isAllSelected"
        v-model="isAllSelected"
        :id="question.inputId + '_' + index"
        :disabled="question.isInputReadOnly || !item.isEnabled"
        v-bind:aria-required="question.isRequired"
        :aria-label="item.locText.renderedHtml"
        :aria-invalid="question.errors.length > 0"
        :aria-describedby="
          question.errors.length > 0 ? question.id + '_errors' : null
        "
        :class="question.cssClasses.itemControl"
      />
      <input
        v-if="item != question.selectAllItem"
        type="checkbox"
        :name="question.name"
        :value="item.value"
        v-model="question.renderedValue"
        :id="question.inputId + '_' + index"
        :disabled="question.isInputReadOnly || !item.isEnabled"
        v-bind:aria-required="question.isRequired"
        :aria-label="item.locText.renderedHtml"
        :aria-invalid="question.errors.length > 0"
        :aria-describedby="
          question.errors.length > 0 ? question.id + '_errors' : null
        "
        :class="question.cssClasses.itemControl"
      />
      <span :class="question.cssClasses.materialDecorator">
        <svg viewBox="0 0 24 24" :class="question.cssClasses.itemDecorator">
          <path d="M5,13l2-2l3,3l7-7l2,2l-9,9L5,13z" />
        </svg>
        <span class="check"></span>
      </span>
      <span
        v-if="!hideLabel"
        :class="question.cssClasses.controlLabel"
        :title="item.locText.text"
      >
        <survey-string :locString="item.locText" />
      </span>
    </label>
    <survey-other-choice
      v-show="
        question.hasOther && question.renderedValue && question.isOtherSelected
      "
      v-if="item.value == question.otherItem.value"
      :question="question"
    />
  </div>
</template>

<script lang="ts">
import { ItemValue, Base } from "survey-core";
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { BaseVue } from "./base";

@Component
export class CheckboxItem extends BaseVue {
  @Prop() question: any;
  @Prop() item: ItemValue;
  @Prop() index: any;
  @Prop() hideLabel: boolean;
  protected getModel(): Base {
    return this.item;
  }
  get isAllSelected() {
    return this.question.isAllSelected;
  }
  set isAllSelected(val: boolean) {
    this.question.isAllSelected = val;
  }
  getLabelClass(item: any) {
    return this.question.getLabelClass(item);
  }
}
Vue.component("survey-checkbox-item", CheckboxItem);
export default CheckboxItem;
</script>

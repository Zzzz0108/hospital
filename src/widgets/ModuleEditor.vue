<script setup>
import { computed } from 'vue'
import { useTestsStore } from '../stores/tests'

const props = defineProps({ selectedId: { type: [String, Number], default: null } })
const emit = defineEmits(['update:selectedId'])
const store = useTestsStore()

const current = computed(() => store.modules.find(m => m.id === props.selectedId) || null)
const minReversal = computed(() => Number(store.basic?.resultReversalN || 1))
const canSave = computed(() => !current.value || Number(current.value.reversal) >= minReversal.value)
</script>

<template>
  <div>
    <div v-if="current" class="v-form">
      <div class="row">
        <span class="lbl">空间频率 (c/d)</span>
        <el-input-number v-model="current.spatial" :min="0" :step="0.1" controls-position="right" size="large" class="ctrl" />
      </div>
      <div class="row">
        <span class="lbl">时间频率 (Hz)</span>
        <el-input-number v-model="current.temporal" :min="0" :step="0.1" controls-position="right" size="large" class="ctrl" />
      </div>
      <div class="row">
        <span class="lbl">间隔时间 (s)</span>
        <el-input-number v-model="current.interval" :min="0" :step="0.1" controls-position="right" size="large" class="ctrl" />
      </div>
      <div class="row">
        <span class="lbl">持续时间 (s)</span>
        <el-input-number v-model="current.duration" :min="0" :step="0.1" controls-position="right" size="large" class="ctrl" />
      </div>
      <div class="row">
        <span class="lbl">初始对比度 (%)</span>
        <el-input-number v-model="current.initialContrast" :min="0" :max="100" :step="1" controls-position="right" size="large" class="ctrl" />
      </div>
      <div class="row">
        <span class="lbl">对比度切换逻辑</span>
        <div class="inline">
          <el-input-number v-model="current.up" :min="1" :step="1" controls-position="right" size="large" style="width:120px;" />
          <el-input-number v-model="current.down" :min="1" :step="1" controls-position="right" size="large" style="width:120px;margin-left:8px;" />
          <el-input-number v-model="current.reversal" :min="minReversal" :step="1" controls-position="right" size="large" style="width:160px;margin-left:8px;" />
        </div>
      </div>
      <div class="row">
        <span class="lbl">对比度切换梯度 (%)</span>
        <div class="col">
          <div class="inline">
            <span class="label-inline">判断正确切换为原有对比度的</span>
            <el-input-number v-model="current.stepCorrect" :min="1" :max="200" :step="1" controls-position="right" size="large" style="width:160px;" />
            <span class="suffix">%</span>
          </div>
          <div class="inline" style="margin-top:8px;">
            <span class="label-inline">判断错误切换为原有对比度的</span>
            <el-input-number v-model="current.stepWrong" :min="1" :max="200" :step="1" controls-position="right" size="large" style="width:160px;" />
            <span class="suffix">%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="btns" v-if="current">
      <el-button type="primary" :disabled="Number(current.reversal) < minReversal" @click="store.saveModules">保存</el-button>
      <el-button @click="() => Object.assign(current, { spatial:4, temporal:2, interval:1, duration:1, initialContrast:50, up:1, down:1, reversal:Math.max(10, minReversal), stepCorrect:80, stepWrong:120 })">重置</el-button>
    </div>
  </div>
</template>

<style scoped>
.v-form{ font-size:16px; display:flex; flex-direction:column; gap:14px; align-items:flex-start; }
.row{ width:820px; display:flex; align-items:center; justify-content:flex-start; gap:16px; }
.lbl{ width:240px; text-align:left; }
.ctrl{ width:320px; }
.inline{ display:flex; align-items:center; }
.col{ display:flex; flex-direction:column; }
.label-inline{ margin-right:8px; }
.suffix{ margin-left:6px; }
.btns{ display:flex; justify-content:flex-end; gap:12px; margin-top:16px; }
</style>



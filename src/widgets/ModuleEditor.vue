<script setup>
import { computed } from 'vue'
import { useTestsStore } from '../stores/tests'

const props = defineProps({ selectedId: { type: [String, Number], default: null } })
const emit = defineEmits(['update:selectedId'])
const store = useTestsStore()

const current = computed(() => store.modules.find(m => m.id === props.selectedId) || null)
const minReversal = computed(() => Number(store.basic?.resultReversalN || 1))
const canSave = computed(() => !current.value || Number(current.value.reversal) >= minReversal.value)

// 更新模块参数的方法（直接修改对象属性，保持响应式）
const updateModule = (field, value) => {
  if (current.value) {
    const moduleIndex = store.modules.findIndex(m => m.id === props.selectedId)
    if (moduleIndex !== -1) {
      // 直接修改对象属性，而不是替换整个对象，这样可以保持 Vue 的响应式
      store.modules[moduleIndex][field] = value
    }
  }
}

// 删除模块
const handleDelete = () => {
  if (!current.value) return
  if (store.modules.length <= 1) {
    alert('至少需要保留一个模块')
    return
  }
  if (confirm(`确定要删除 ${current.value.name} 吗？`)) {
    const currentId = current.value.id
    const currentIndex = store.modules.findIndex(m => m.id === currentId)
    store.removeModule(currentId)
    // 删除后，切换到其他模块
    if (store.modules.length > 0) {
      // 如果删除的不是最后一个，切换到下一个；否则切换到上一个
      const nextIndex = currentIndex < store.modules.length ? currentIndex : currentIndex - 1
      const nextModule = store.modules[nextIndex]
      if (nextModule) {
        emit('update:selectedId', nextModule.id)
      }
    }
  }
}
</script>

<template>
  <div>
    <div v-if="current" class="v-form">
      <div class="row">
        <span class="lbl">空间频率 (c/d)</span>
        <el-input-number
          :model-value="current.spatial"
          @update:model-value="(val) => updateModule('spatial', val)"
          :min="0"
          :step="0.1"
          controls-position="right"
          size="large"
          class="ctrl"
        />
      </div>
      <div class="row">
        <span class="lbl">时间频率 (Hz)</span>
        <el-input-number
          :model-value="current.temporal"
          @update:model-value="(val) => updateModule('temporal', val)"
          :min="0"
          :step="0.1"
          controls-position="right"
          size="large"
          class="ctrl"
        />
      </div>
      <div class="row">
        <span class="lbl">间隔时间 (s)</span>
        <el-input-number
          :model-value="current.interval"
          @update:model-value="(val) => updateModule('interval', val)"
          :min="0"
          :step="0.1"
          controls-position="right"
          size="large"
          class="ctrl"
        />
      </div>
      <div class="row">
        <span class="lbl">持续时间 (s)</span>
        <el-input-number
          :model-value="current.duration"
          @update:model-value="(val) => updateModule('duration', val)"
          :min="0"
          :step="0.1"
          controls-position="right"
          size="large"
          class="ctrl"
        />
      </div>
      <div class="row">
        <span class="lbl">初始对比度 (%)</span>
        <el-input-number
          :model-value="current.initialContrast"
          @update:model-value="(val) => updateModule('initialContrast', val)"
          :min="0"
          :max="100"
          :step="1"
          controls-position="right"
          size="large"
          class="ctrl"
        />
      </div>
      <div class="row">
        <span class="lbl">对比度切换逻辑</span>
        <div class="inline">
          <el-input-number
            :model-value="current.up"
            @update:model-value="(val) => updateModule('up', val)"
            :min="1"
            :step="1"
            controls-position="right"
            size="large"
            style="width:120px;"
          />
          <el-input-number
            :model-value="current.down"
            @update:model-value="(val) => updateModule('down', val)"
            :min="1"
            :step="1"
            controls-position="right"
            size="large"
            style="width:120px;margin-left:8px;"
          />
          <el-input-number
            :model-value="current.reversal"
            @update:model-value="(val) => updateModule('reversal', val)"
            :min="minReversal"
            :step="1"
            controls-position="right"
            size="large"
            style="width:160px;margin-left:8px;"
          />
        </div>
      </div>
      <div class="row">
        <span class="lbl">对比度切换梯度 (%)</span>
        <div class="col">
          <div class="inline">
            <span class="label-inline">判断正确切换为原有对比度的</span>
            <el-input-number
              :model-value="current.stepCorrect"
              @update:model-value="(val) => updateModule('stepCorrect', val)"
              :min="1"
              :max="200"
              :step="1"
              controls-position="right"
              size="large"
              style="width:160px;"
            />
            <span class="suffix">%</span>
          </div>
          <div class="inline" style="margin-top:8px;">
            <span class="label-inline">判断错误切换为原有对比度的</span>
            <el-input-number
              :model-value="current.stepWrong"
              @update:model-value="(val) => updateModule('stepWrong', val)"
              :min="1"
              :max="200"
              :step="1"
              controls-position="right"
              size="large"
              style="width:160px;"
            />
            <span class="suffix">%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="btns" v-if="current">
      <el-button type="primary" :disabled="Number(current.reversal) < minReversal" @click="store.saveModules">保存</el-button>
      <el-button @click="() => {
        updateModule('spatial', 4)
        updateModule('temporal', 2)
        updateModule('interval', 1)
        updateModule('duration', 1)
        updateModule('initialContrast', 50)
        updateModule('up', 1)
        updateModule('down', 1)
        updateModule('reversal', Math.max(10, minReversal))
        updateModule('stepCorrect', 80)
        updateModule('stepWrong', 120)
      }">重置</el-button>
      <el-button type="danger" @click="handleDelete">删除</el-button>
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



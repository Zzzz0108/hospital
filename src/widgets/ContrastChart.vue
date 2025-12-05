<script setup>
import { computed } from 'vue'

const props = defineProps({
  trials: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  }
})

const width = 420
const height = 200
const padding = 30

const points = computed(() => {
  if (!props.trials.length) return ''
  const xs = props.trials.map(t => t.trial || 0)
  const ys = props.trials.map(t => Number(t.contrast || 0))

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  return props.trials
    .map(t => {
      const xNorm = ((t.trial || 0) - minX) / spanX
      const yNorm = (Number(t.contrast || 0) - minY) / spanY
      const x = padding + xNorm * (width - 2 * padding)
      const y = height - padding - yNorm * (height - 2 * padding)
      return `${x},${y}`
    })
    .join(' ')
})

const minContrast = computed(() => {
  if (!props.trials.length) return 0
  return Math.min(...props.trials.map(t => Number(t.contrast || 0)))
})

const maxContrast = computed(() => {
  if (!props.trials.length) return 0
  return Math.max(...props.trials.map(t => Number(t.contrast || 0)))
})
</script>

<template>
  <div class="chart-wrap">
    <div class="chart-header">
      <span class="title">{{ title }}</span>
      <span v-if="trials.length" class="range">
        对比度范围：{{ minContrast.toFixed(1) }}% ~ {{ maxContrast.toFixed(1) }}%
      </span>
    </div>
    <svg :width="width" :height="height">
      <!-- 坐标轴 -->
      <line :x1="padding" :y1="height - padding" :x2="width - padding" :y2="height - padding" stroke="#666" stroke-width="1" />
      <line :x1="padding" :y1="padding" :x2="padding" :y2="height - padding" stroke="#666" stroke-width="1" />

      <!-- 折线 -->
      <polyline
        v-if="points"
        :points="points"
        fill="none"
        stroke="#1890ff"
        stroke-width="2"
      />

      <!-- reversal 点高亮（如果有标记） -->
      <template v-for="t in trials" :key="t.trial">
        <circle
          v-if="t.reversal"
          :cx="padding + ((t.trial || 0) - (trials[0]?.trial || 0)) / ((trials[trials.length-1]?.trial || 1) - (trials[0]?.trial || 0) || 1) * (width - 2 * padding)"
          :cy="height - padding - (Number(t.contrast || 0) - minContrast) / ((maxContrast - minContrast) || 1) * (height - 2 * padding)"
          r="3"
          fill="#ff4d4f"
        />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.chart-wrap {
  margin-top: 8px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 4px;
}
.title {
  font-weight: 600;
}
.range {
  color: #666;
}
</style>



<template>
  <div class="run-view">
    <!-- 准备阶段 -->
    <div v-if="runStore.phase === 'ready'" class="phase-content">
      <h2>测试准备</h2>
      <p>请确认测试参数：</p>
      <div class="test-info">
        <p><strong>测试名称：</strong>{{ runStore.currentTestName }}</p>
        <p><strong>患者：</strong>{{ runStore.currentPatient?.name }}</p>
        <p><strong>眼别：</strong>{{ runStore.currentTest?.eye }}</p>
        <p><strong>模块数量：</strong>{{ runStore.moduleOrder.length }}</p>
      </div>
      <el-button type="primary" size="large" @click="runStore.start()">开始测试</el-button>
    </div>

    <!-- 指导阶段 -->
    <div v-if="runStore.phase === 'guide'" class="phase-content">
      <h2>测试指导</h2>
      <div class="guide-text">
        <p>测试准备开始</p>
        <p>观察并判断光栅方向</p>
        <p>按空格键开始测试</p>
      </div>
      <el-button type="primary" size="large" @click="runStore.startCanvas()">开始测试</el-button>
    </div>

    <!-- 测试阶段 -->
    <div v-if="runStore.phase === 'canvas'" class="phase-content">
      <div class="test-header">
        <h3>模块 {{ runStore.currentModuleIndex + 1 }} / {{ runStore.moduleOrder.length }}</h3>
        <p>当前对比度: {{ runStore.currentContrast.toFixed(1) }}% | 试验: {{ runStore.currentTrial }}</p>
        <p>Reversal: {{ runStore.reversalCount }} / {{ runStore.currentModule?.reversal }}</p>
      </div>
      
      <RunCanvas />
    </div>

    <!-- 结束阶段 -->
    <div v-if="runStore.phase === 'end'" class="phase-content">
      <h2>测试结束</h2>
      <div class="results-summary">
        <h3>测试结果</h3>
        <div class="patient-info">
          <p><strong>姓名：</strong>{{ runStore.currentPatient?.name }}</p>
          <p><strong>性别：</strong>{{ runStore.currentPatient?.gender }}</p>
          <p><strong>生日：</strong>{{ runStore.currentPatient?.birthday }}</p>
          <p><strong>ID号：</strong>{{ runStore.currentPatient?.id }}</p>
          <p><strong>测试日期：</strong>{{ new Date().toLocaleDateString() }}</p>
          <p><strong>测试模式：</strong>{{ runStore.currentTest?.basic?.mode }}</p>
          <p><strong>测试眼别：</strong>{{ runStore.currentTest?.eye }}</p>
        </div>
        
        <div class="thresholds">
          <h4>各模块对比度阈值：</h4>
          <div v-for="(result, index) in runStore.moduleResults" :key="index" class="threshold-item">
            <p>模块 {{ index + 1 }}: {{ result.threshold.toFixed(2) }}% 
               (空间频率: {{ result.spatial }} c/d, 时间频率: {{ result.temporal }} Hz)</p>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <el-button type="primary" @click="exportResults">导出结果</el-button>
        <el-button @click="runStore.reset(); $router.push('/')">返回主界面</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRunStore } from '../stores/run'
import RunCanvas from '../widgets/RunCanvas.vue'

const runStore = useRunStore()

const handleKeyPress = (e) => {
  if (runStore.phase === 'guide' && e.code === 'Space') {
    e.preventDefault()
    runStore.startCanvas()
  } else if (runStore.phase === 'canvas') {
    if (e.code === 'Escape') {
      e.preventDefault()
      // 测试过程中按ESC：直接结束测试
      runStore.phase = 'end'
    } else {
      const mode = runStore.currentTest?.basic?.mode || 'auto'
      
      // 手动模式：WASD 是医生控制光栅方向，方向键是患者判断
      if (mode === 'manual') {
        if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
          e.preventDefault()
          runStore.handleDoctorControl(e.code)
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault()
          const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
          }
          runStore.handleKeyPress(keyMap[e.code])
        }
      } else {
        // 自动模式：只有方向键是患者判断
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault()
          const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
          }
          runStore.handleKeyPress(keyMap[e.code])
        }
      }
    }
  } else if (runStore.phase === 'end' && e.code === 'Escape') {
    e.preventDefault()
    runStore.reset()
    // 结果页面按ESC：返回主界面
    window.location.href = '/'
  }
}

const exportResults = () => {
  // TODO: 实现导出功能
  console.log('导出结果', runStore.moduleResults)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.run-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.phase-content {
  text-align: center;
  padding: 40px 20px;
}

.test-info {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.guide-text {
  font-size: 18px;
  line-height: 1.6;
  margin: 30px 0;
}

.test-header {
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f9ff;
  border-radius: 8px;
}

.test-header h3 {
  margin: 0 0 10px 0;
  color: #1890ff;
}

.test-header p {
  margin: 5px 0;
  font-size: 14px;
}

.instructions {
  margin-top: 20px;
}

.key-instructions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 15px;
}

.key {
  display: inline-block;
  padding: 8px 12px;
  background: #f0f0f0;
  border: 2px solid #ccc;
  border-radius: 4px;
  font-weight: bold;
  margin-right: 5px;
}

.results-summary {
  text-align: left;
  max-width: 600px;
  margin: 0 auto;
}

.patient-info {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.thresholds {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.threshold-item {
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.threshold-item:last-child {
  border-bottom: none;
}

.actions {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>



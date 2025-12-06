import { defineStore } from 'pinia'
import { useTestsStore } from './tests'
import { usePatientsStore } from './patients'

export const useRunStore = defineStore('run', {
  state: () => ({
    phase: 'ready', // ready, guide, canvas, moduleGap, end
    currentTest: null, // 当前测试方案
    currentModuleIndex: 0, // 当前模块索引
    currentModule: null, // 当前模块
    moduleOrder: [], // 模块显示顺序
    currentTrial: 0,
    currentContrast: 50,
    currentDirection: 'up', // up, down, left, right
    correctCount: 0,
    wrongCount: 0,
    reversalCount: 0,
    lastDirection: null, // 用于检测 reversal
    trials: [], // 记录每次试验
    moduleResults: [], // 每个模块的结果
    startTime: null,
    displayTimer: null,
    intervalTimer: null,
    responseTimer: null, // 2秒响应超时
    moduleGapTimer: null, // 模块间隔定时器
    currentSessionId: null, // 当前测试会话ID（保存后）
    isFinishing: false, // 防止 finishTest 被多次调用
    isFinishingModule: false, // 防止 finishModule 被多次调用
  }),
  getters: {
    isModuleComplete(){
      return this.currentModule && this.reversalCount >= this.currentModule.reversal
    },
    isTestComplete(){
      return this.currentModuleIndex >= this.moduleOrder.length
    },
    currentPatient(){
      const p = usePatientsStore()
      return p.all.find(x=>x.id===p.selectedId)
    },
    currentTestName(){
      return this.currentTest?.basic?.name || '未设置'
    }
  },
  actions: {
    start(){
      const tests = useTestsStore()
      const patients = usePatientsStore()
      
      if(!patients.selectedId || !tests.modules.length){
        alert('请先选择患者和配置测试模块')
        return
      }
      
      // 每次开始新测试前，完全重置所有状态（使用 reset 方法确保清空所有数据）
      this.reset()
      
      // 初始化新测试的状态
      this.phase = 'guide'
      this.currentTest = tests
      this.currentModuleIndex = 0
      this.currentModule = null
      // 深拷贝模块顺序，避免 getter 每次返回新数组导致的问题
      this.moduleOrder = JSON.parse(JSON.stringify(tests.moduleOrder))
      this.currentTrial = 0
      this.currentContrast = 50
      this.currentDirection = 'up'
      this.correctCount = 0
      this.wrongCount = 0
      this.reversalCount = 0
      this.lastDirection = null
      this.trials = []
      // moduleResults 已经在 reset() 中清空，这里再次确认
      if (this.moduleResults.length > 0) {
        console.warn(`[start] moduleResults not empty after reset, clearing again. Length: ${this.moduleResults.length}`)
        this.moduleResults = []
      }
      this.startTime = null
      // currentSessionId 已经在 reset() 中清空，这里再次确认
      if (this.currentSessionId) {
        console.warn(`[start] currentSessionId not null after reset, clearing again. ID: ${this.currentSessionId}`)
        this.currentSessionId = null
      }
      this.isFinishing = false
      this.isFinishingModule = false

      console.log(`[start] Starting new test with ${this.moduleOrder.length} module(s), moduleResults cleared (length: ${this.moduleResults.length})`)
      console.log(`[start] Module order:`, this.moduleOrder.map((m, i) => `Module ${i}: spatial=${m.spatial}, temporal=${m.temporal}`))
      this.startModule()
    },
    
    startModule(){
      // 防止重复调用
      if (this.isFinishing) {
        console.warn('[startModule] Test is finishing, skipping')
        return
      }
      
      // 检查是否所有模块都已完成
      if(this.isTestComplete){
        console.log(`[startModule] All modules complete (${this.currentModuleIndex} >= ${this.moduleOrder.length}), calling finishTest`)
        this.finishTest()
        return
      }
      
      // 检查是否已经有这个模块的结果了（防止重复开始）
      if (this.moduleResults.some(r => r.moduleIndex === this.currentModuleIndex)) {
        console.warn(`[startModule] Module ${this.currentModuleIndex} already has result, skipping to next`)
        // 如果已经有结果，直接跳到下一个模块
        this.currentModuleIndex++
        if (this.isTestComplete) {
          this.finishTest()
          return
        }
        // 递归调用，启动下一个模块
        this.startModule()
        return
      }
      
      // 检查索引是否超出范围
      if (this.currentModuleIndex >= this.moduleOrder.length) {
        console.log(`[startModule] Module index ${this.currentModuleIndex} >= total modules ${this.moduleOrder.length}, calling finishTest`)
        this.finishTest()
        return
      }
      
      this.currentModule = this.moduleOrder[this.currentModuleIndex]
      if (!this.currentModule) {
        console.warn(`[startModule] No module found at index ${this.currentModuleIndex}, total modules: ${this.moduleOrder.length}`)
        // 如果没有模块了，结束测试
        this.finishTest()
        return
      }
      
      console.log(`[startModule] Starting module ${this.currentModuleIndex + 1}/${this.moduleOrder.length}`)
      console.log(`[startModule] Module params: spatial=${this.currentModule.spatial}, temporal=${this.currentModule.temporal}, reversal=${this.currentModule.reversal}`)
      
      // 重置当前模块的状态
      this.currentContrast = this.currentModule.initialContrast
      this.currentTrial = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.reversalCount = 0
      this.lastDirection = null
      this.trials = [] // 清空当前模块的试验记录
      this.startTime = Date.now()
      this.isFinishingModule = false // 确保标志已重置
      
      // 如果是从模块间隔时间后启动的，设置 phase 为 canvas
      if (this.phase === 'moduleGap') {
        this.phase = 'canvas'
      }
    },
    
    startCanvas(){
      this.phase = 'canvas'
      this.nextTrial()
    },
    
    nextTrial(){
      // 防止在完成过程中继续执行
      if (this.isFinishing || this.isFinishingModule) {
        console.warn('[nextTrial] Already finishing, skipping')
        return
      }
      
      // 检查测试是否已完成
      if (this.isTestComplete) {
        console.warn('[nextTrial] Test already complete, skipping')
        return
      }
      
      // 检查是否有当前模块（可能在 finishModule 中被清除了）
      if (!this.currentModule) {
        console.warn('[nextTrial] No current module, skipping')
        return
      }
      
      if(this.isModuleComplete){
        // 确保只调用一次 finishModule
        const alreadyFinished = this.moduleResults.some(r => r.moduleIndex === this.currentModuleIndex)
        if (!alreadyFinished && !this.isFinishingModule) {
          console.log(`[nextTrial] Module ${this.currentModuleIndex} complete, calling finishModule`)
          // 清除所有定时器，防止在 finishModule 过程中继续触发
          this.clearTimers()
          this.finishModule()
        } else {
          console.warn(`[nextTrial] Module ${this.currentModuleIndex} already finished or finishing, skipping`)
        }
        return
      }
      
      this.currentTrial++
      this.currentDirection = this.getRandomDirection()
      this.startDisplay()
    },
    
    getRandomDirection(){
      const mode = this.currentTest?.basic?.mode || 'auto'
      const orientation = this.currentTest?.basic?.orientation || 'vertical'
      
      if(mode === 'auto'){
        // 自动模式：根据orientation随机选择方向
        if(orientation === 'vertical'){
          // 垂直光栅：随机水平运动（左或右）
          return Math.random() < 0.5 ? 'left' : 'right'
        } else {
          // 水平光栅：随机垂直运动（上或下）
          return Math.random() < 0.5 ? 'up' : 'down'
        }
      } else {
        // 手动模式：完全随机（医生用WASD控制，这里只是初始值）
        const dirs = ['up', 'down', 'left', 'right']
        return dirs[Math.floor(Math.random() * dirs.length)]
      }
    },
    
    // 处理医生控制（WASD键，仅手动模式）
    handleDoctorControl(key){
      if(this.phase !== 'canvas') return
      const mode = this.currentTest?.basic?.mode || 'auto'
      if(mode !== 'manual') return // 只有手动模式才响应
      
      // WASD 映射到方向
      const keyMap = {
        'KeyW': 'up',
        'KeyS': 'down',
        'KeyA': 'left',
        'KeyD': 'right'
      }
      
      const direction = keyMap[key]
      if(direction){
        this.currentDirection = direction
      }
    },
    
    startDisplay(){
      // 检查是否有当前模块（可能在 finishModule 中被清除了）
      if (!this.currentModule) {
        console.warn('[startDisplay] No current module, skipping')
        return
      }
      
      // 记录显示开始时间
      const displayStartTime = Date.now()
      
      // 显示光栅 duration 秒（持续时间）
      this.displayTimer = setTimeout(() => {
        this.hideGrating()
      }, this.currentModule.duration * 1000)
      
      // 响应超时：持续时间 + 间隔时间（患者需要在这个总时间段内做出判断）
      const totalResponseTime = (this.currentModule.duration + this.currentModule.interval) * 1000
      this.responseTimer = setTimeout(() => {
        this.handleTimeout()
      }, totalResponseTime)
    },
    
    hideGrating(){
      // 检查是否有当前模块（可能在 finishModule 中被清除了）
      if (!this.currentModule) {
        console.warn('[hideGrating] No current module, skipping')
        return
      }
      
      // 隐藏光栅（但患者仍然可以在间隔时间内响应）
      // 注意：不在 hideGrating 中自动开始下一个试验
      // 下一个试验会在患者响应（handleKeyPress）或超时（handleTimeout）后开始
      // 响应超时定时器已经在 startDisplay 中设置（持续时间 + 间隔时间）
    },
    
    handleTimeout(){
      // 在持续时间 + 间隔时间内未响应，判定为错误
      // 清除所有定时器
      this.clearTimers()
      // 处理超时响应
      this.handleKeyPress('timeout')
    },
    
    handleKeyPress(key){
      // 只在 canvas 阶段响应输入，模块间隔期间不响应
      if(this.phase !== 'canvas') return
      
      // 检查是否有当前模块（可能在 finishModule 中被清除了）
      if (!this.currentModule) {
        console.warn('[handleKeyPress] No current module, skipping')
        return
      }
      
      // 清除响应超时定时器
      if (this.responseTimer) {
        clearTimeout(this.responseTimer)
        this.responseTimer = null
      }
      
      const isCorrect = key === this.currentDirection
      const responseTime = Date.now() - this.startTime
      
      // 记录试验
      const trial = {
        trial: this.currentTrial,
        moduleIndex: this.currentModuleIndex, // 添加模块索引
        direction: this.currentDirection,
        response: key,
        correct: isCorrect,
        contrast: this.currentContrast,
        spatial: this.currentModule.spatial,
        temporal: this.currentModule.temporal,
        responseTime,
        timestamp: Date.now()
      }
      this.trials.push(trial)
      
      // 更新计数
      if(isCorrect){
        this.correctCount++
        this.wrongCount = 0
      } else {
        this.wrongCount++
        this.correctCount = 0
      }
      
      // 检测 reversal
      this.checkReversal(isCorrect)
      
      // 调整对比度
      this.adjustContrast(isCorrect)
      
      // 清除显示和间隔定时器（如果还在运行）
      if (this.displayTimer) {
        clearTimeout(this.displayTimer)
        this.displayTimer = null
      }
      if (this.intervalTimer) {
        clearTimeout(this.intervalTimer)
        this.intervalTimer = null
      }
      
      // 继续下一个试验（延迟一小段时间，确保状态已更新）
      setTimeout(() => this.nextTrial(), 500)
    },
    
    clearTimers(){
      if(this.displayTimer) {
        clearTimeout(this.displayTimer)
        this.displayTimer = null
      }
      if(this.intervalTimer) {
        clearTimeout(this.intervalTimer)
        this.intervalTimer = null
      }
      if(this.responseTimer) {
        clearTimeout(this.responseTimer)
        this.responseTimer = null
      }
      if(this.moduleGapTimer) {
        clearTimeout(this.moduleGapTimer)
        this.moduleGapTimer = null
      }
    },
    
    checkReversal(isCorrect){
      const currentTrend = isCorrect ? 'down' : 'up'
      let isReversal = false
      
      if(this.lastDirection && this.lastDirection !== currentTrend){
        this.reversalCount++
        isReversal = true
      }
      this.lastDirection = currentTrend
      
      // 在最新的trial中标记reversal
      if(this.trials.length > 0){
        this.trials[this.trials.length - 1].reversal = isReversal
      }
    },
    
    adjustContrast(isCorrect){
      // 检查是否有当前模块（可能在 finishModule 中被清除了）
      if (!this.currentModule) {
        console.warn('[adjustContrast] No current module, skipping')
        return
      }
      
      if(isCorrect && this.correctCount >= this.currentModule.down){
        // 判断正确：对比度下降（stepCorrect < 100）
        this.currentContrast *= (this.currentModule.stepCorrect / 100)
        this.correctCount = 0
      } else if(!isCorrect && this.wrongCount >= this.currentModule.up){
        // 判断错误：对比度上升（stepWrong > 100）
        this.currentContrast *= (this.currentModule.stepWrong / 100)
        this.wrongCount = 0
      }
      
      // 限制对比度范围
      this.currentContrast = Math.max(1, Math.min(100, this.currentContrast))
    },
    
    finishModule(){
      // 防止重复调用
      if (this.isFinishing || this.isFinishingModule) {
        console.warn(`[finishModule] Already in progress (isFinishing=${this.isFinishing}, isFinishingModule=${this.isFinishingModule}), skipping`)
        return
      }
      
      // 防止同一个模块被重复结束（更严格的检查）
      const existingResult = this.moduleResults.find(r => r.moduleIndex === this.currentModuleIndex)
      if (existingResult) {
        console.warn(`[finishModule] Module ${this.currentModuleIndex} already finished (threshold: ${existingResult.threshold}), skipping finishModule`)
        // 如果已经完成，直接跳到下一个模块
        this.currentModuleIndex++
        if (this.isTestComplete) {
          this.finishTest()
        } else {
          // 清除之前的模块间隔定时器（如果存在）
          if (this.moduleGapTimer) {
            clearTimeout(this.moduleGapTimer)
          }
          this.moduleGapTimer = setTimeout(() => {
            this.moduleGapTimer = null
            if (!this.isTestComplete && !this.isFinishing) {
              this.startModule()
            }
          }, this.currentTest.basic.moduleGapSec * 1000)
        }
        return
      }

      if (!this.currentModule) {
        console.error('[finishModule] currentModule is null')
        return
      }
      
      // 设置标志，防止重复调用
      this.isFinishingModule = true
      
      // 确保清除所有定时器（包括可能还在运行的 displayTimer, intervalTimer, responseTimer）
      this.clearTimers()

      // 保存当前模块的引用，因为后面会清除 currentModule
      const finishedModule = this.currentModule
      const finishedModuleIndex = this.currentModuleIndex
      
      // 深拷贝 trials，避免被后续模块污染
      const moduleTrials = JSON.parse(JSON.stringify(this.trials))
      
      // 计算阈值：最后 N 次 reversal 的对比度平均值
      const reversalTrials = moduleTrials.filter(t => t.reversal)
      const lastN = reversalTrials.slice(-this.currentTest.basic.resultReversalN)
      const threshold = lastN.length > 0 ? 
        lastN.reduce((sum, t) => sum + t.contrast, 0) / lastN.length : 
        this.currentContrast
      
      // 保存模块结果
      const moduleResult = {
        moduleIndex: finishedModuleIndex,
        moduleId: finishedModule.id,
        threshold,
        trials: moduleTrials, // 使用深拷贝的 trials
        spatial: finishedModule.spatial,
        temporal: finishedModule.temporal,
        reversalCount: this.reversalCount,
        totalTrials: this.currentTrial,
        duration: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      }
      
      console.log(`[finishModule] Module ${finishedModuleIndex + 1}/${this.moduleOrder.length} finished`)
      console.log(`[finishModule] Module params: spatial=${finishedModule.spatial}, temporal=${finishedModule.temporal}`)
      console.log(`[finishModule] Module result: threshold=${moduleResult.threshold.toFixed(2)}%, trials=${moduleResult.trials.length}, reversals=${moduleResult.reversalCount}`)
      console.log(`[finishModule] Current moduleResults length: ${this.moduleResults.length}, adding 1 more`)
      
      this.moduleResults.push(moduleResult)
      console.log(`[finishModule] After push, moduleResults length: ${this.moduleResults.length}`)
      console.log(`[finishModule] All moduleResults:`, this.moduleResults.map(r => `Module ${r.moduleIndex}: spatial=${r.spatial}, temporal=${r.temporal}`))
      
      // 立即清除 currentModule，防止 nextTrial 继续检查 isModuleComplete
      // 注意：必须在设置 moduleGapTimer 之前清除，确保不会有回调访问到已清除的 currentModule
      this.currentModule = null
      this.reversalCount = 0 // 重置 reversalCount，防止 isModuleComplete 继续返回 true
      
      // 切换到下一模块
      const oldModuleIndex = finishedModuleIndex
      this.currentModuleIndex++
      
      // 检查是否所有模块都完成了（在重置标志之前检查，防止重复调用）
      if (this.isTestComplete) {
        console.log(`[finishModule] All modules complete (${this.currentModuleIndex} >= ${this.moduleOrder.length}), calling finishTest`)
        // 确保清除所有定时器，包括可能存在的模块间隔定时器
        this.clearTimers()
        // 重置标志（在调用 finishTest 之前重置，因为 finishTest 会设置 phase = 'end'）
        this.isFinishingModule = false
        this.finishTest()
        return
      }
      
      // 模块间隔时间后启动下一个模块
      // 清除之前的模块间隔定时器（如果存在）
      if (this.moduleGapTimer) {
        clearTimeout(this.moduleGapTimer)
        this.moduleGapTimer = null
      }
      
      // 获取模块间隔时间（确保正确读取）
      const gapSec = this.currentTest?.basic?.moduleGapSec || 1
      console.log(`[finishModule] Module ${oldModuleIndex + 1} finished, will start module ${this.currentModuleIndex + 1} after ${gapSec}s`)
      
      // 设置 phase 为 moduleGap，在模块间隔期间不显示光栅，不响应输入
      this.phase = 'moduleGap'
      
      // 设置模块间隔定时器
      this.moduleGapTimer = setTimeout(() => {
        this.moduleGapTimer = null
        // 再次检查是否已完成（防止在定时器执行期间测试已完成）
        if (!this.isTestComplete && !this.isFinishing) {
          // 在启动下一个模块前重置标志
          this.isFinishingModule = false
          console.log(`[finishModule] Timer fired after ${gapSec}s, starting next module ${this.currentModuleIndex + 1}`)
          this.startModule()
        } else {
          console.warn(`[finishModule] Timer fired but conditions not met: isTestComplete=${this.isTestComplete}, isFinishing=${this.isFinishing}`)
          this.isFinishingModule = false
        }
      }, gapSec * 1000)
    },
    
    async finishTest(){
      // 防止重复调用
      if (this.isFinishing) {
        console.warn('finishTest already in progress, skipping')
        return
      }
      
      // 如果已经保存过了，直接进入结束页面
      if (this.currentSessionId) {
        console.warn('Test already saved, skipping')
        this.phase = 'end'
        return
      }
      
      this.isFinishing = true
      
      // 保存完整测试结果到数据库
      try {
        // 为后端构造精简版的模块结果和试验记录，避免 payload 过大
        // 按照 moduleOrder 的顺序，为每个模块找到对应的结果
        const slimModuleResults = this.moduleOrder.map((module, index) => {
          // 找到对应 moduleIndex 的结果
          const result = this.moduleResults.find(r => r.moduleIndex === index)
          if (!result) {
            console.warn(`Module ${index} has no result`)
            return null
          }
          return {
            moduleIndex: result.moduleIndex,
            threshold: result.threshold,
            spatial: result.spatial,
            temporal: result.temporal,
            reversalCount: result.reversalCount,
            totalTrials: result.totalTrials,
            duration: result.duration,
          }
        }).filter(r => r !== null) // 过滤掉没有结果的模块

        // 将所有模块的 trials 扁平化为一个数组，附带 moduleIndex
        const allTrials = this.moduleResults.flatMap(r =>
          (r.trials || []).map(t => ({
            ...t,
            moduleIndex: r.moduleIndex,
          }))
        )

        const res = await fetch('http://localhost:3001/api/test-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: this.currentPatient.id,
            testTemplateId: this.currentTest.currentTestId || null,
            testName: this.currentTestName,
            eye: this.currentTest.eye,
            mode: this.currentTest.basic.mode,
            basic: this.currentTest.basic,
            modules: this.moduleOrder, // 模块配置（按顺序）
            moduleResults: slimModuleResults, // 精简模块结果（按 moduleOrder 顺序对应）
            trials: allTrials, // 所有试验记录（按 moduleIndex 区分模块）
            totalDuration: Date.now() - this.startTime
          })
        })
        
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '保存失败')

        // 保存sessionId
        this.currentSessionId = data.data?.id || null

        // 重新从数据库加载该患者的测试结果列表，确保"一次测试=一条记录"
        const testsStore = useTestsStore()
        await testsStore.loadResults(this.currentPatient.id)

        this.phase = 'end'
      } catch (e) {
        console.error('save test result error', e)
        alert('保存测试结果失败：' + (e.message || '请检查后端服务'))
        this.phase = 'end' // 即使保存失败也进入结束页面
      } finally {
        this.isFinishing = false
      }
    },
    
    reset(){
      this.phase = 'ready'
      this.currentTest = null
      this.currentModuleIndex = 0
      this.currentModule = null
      this.moduleOrder = []
      this.currentTrial = 0
      this.currentContrast = 50
      this.currentDirection = 'up'
      this.correctCount = 0
      this.wrongCount = 0
      this.reversalCount = 0
      this.lastDirection = null
      this.trials = []
      this.moduleResults = [] // 确保清空之前的结果
      this.startTime = null
      this.currentSessionId = null // 确保清空之前的会话ID
      this.isFinishing = false
      this.isFinishingModule = false
      this.clearTimers()
      console.log('[reset] All state cleared, moduleResults length:', this.moduleResults.length)
    }
  }
})



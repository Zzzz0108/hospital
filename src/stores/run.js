import { defineStore } from 'pinia'
import { useTestsStore } from './tests'
import { usePatientsStore } from './patients'

export const useRunStore = defineStore('run', {
  state: () => ({
    phase: 'ready', // ready, guide, canvas, end
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
      
      this.phase = 'guide'
      this.currentTest = tests
      this.currentModuleIndex = 0
      this.moduleOrder = tests.moduleOrder // 使用测试store的模块顺序
      this.startModule()
    },
    
    startModule(){
      if(this.isTestComplete){
        this.finishTest()
        return
      }
      
      this.currentModule = this.moduleOrder[this.currentModuleIndex]
      this.currentContrast = this.currentModule.initialContrast
      this.currentTrial = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.reversalCount = 0
      this.trials = []
      this.startTime = Date.now()
    },
    
    startCanvas(){
      this.phase = 'canvas'
      this.nextTrial()
    },
    
    nextTrial(){
      if(this.isModuleComplete){
        this.finishModule()
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
      // 显示光栅 duration 秒
      this.displayTimer = setTimeout(() => {
        this.hideGrating()
      }, this.currentModule.duration * 1000)
      
      // 2秒响应超时
      this.responseTimer = setTimeout(() => {
        this.handleTimeout()
      }, 2000)
    },
    
    hideGrating(){
      // 隐藏光栅 interval 秒
      this.intervalTimer = setTimeout(() => {
        this.nextTrial()
      }, this.currentModule.interval * 1000)
    },
    
    handleTimeout(){
      // 2秒内未响应，判定为错误
      this.handleKeyPress('timeout')
    },
    
    handleKeyPress(key){
      if(this.phase !== 'canvas') return
      
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
      
      // 清除定时器
      this.clearTimers()
      
      // 继续下一试验
      setTimeout(() => this.nextTrial(), 500)
    },
    
    clearTimers(){
      if(this.displayTimer) clearTimeout(this.displayTimer)
      if(this.intervalTimer) clearTimeout(this.intervalTimer)
      if(this.responseTimer) clearTimeout(this.responseTimer)
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
      // 计算阈值：最后 N 次 reversal 的对比度平均值
      const reversalTrials = this.trials.filter(t => t.reversal)
      const lastN = reversalTrials.slice(-this.currentTest.basic.resultReversalN)
      const threshold = lastN.length > 0 ? 
        lastN.reduce((sum, t) => sum + t.contrast, 0) / lastN.length : 
        this.currentContrast
      
      // 保存模块结果
      const moduleResult = {
        moduleIndex: this.currentModuleIndex,
        moduleId: this.currentModule.id,
        threshold,
        trials: this.trials,
        spatial: this.currentModule.spatial,
        temporal: this.currentModule.temporal,
        reversalCount: this.reversalCount,
        totalTrials: this.currentTrial,
        duration: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      }
      this.moduleResults.push(moduleResult)
      
      // 切换到下一模块
      this.currentModuleIndex++
      
      // 模块间隔时间
      setTimeout(() => {
        this.startModule()
      }, this.currentTest.basic.moduleGapSec * 1000)
    },
    
    async finishTest(){
      // 保存完整测试结果到数据库
      try {
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
            modules: this.moduleOrder, // 模块配置
            moduleResults: this.moduleResults, // 模块结果
            trials: this.trials, // 所有试验记录
            totalDuration: Date.now() - this.startTime
          })
        })
        
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '保存失败')
        
        // 同时保存到本地 state（用于显示）
        const result = {
          id: data.data.id,
          patientId: this.currentPatient.id,
          testName: this.currentTestName,
          eye: this.currentTest.eye,
          mode: this.currentTest.basic.mode,
          moduleResults: this.moduleResults,
          totalDuration: Date.now() - this.startTime,
          timestamp: new Date().toISOString(),
          time: new Date().toLocaleString()
        }
        
        // 添加到已完成测试列表
        if(!this.currentTest.results) this.currentTest.results = []
        this.currentTest.results.push(result)
        
        this.phase = 'end'
      } catch (e) {
        console.error('save test result error', e)
        alert('保存测试结果失败：' + (e.message || '请检查后端服务'))
        this.phase = 'end' // 即使保存失败也进入结束页面
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
      this.correctCount = 0
      this.wrongCount = 0
      this.reversalCount = 0
      this.trials = []
      this.moduleResults = []
      this.startTime = null
      this.clearTimers()
    }
  }
})



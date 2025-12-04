import { defineStore } from 'pinia'
import { usePatientsStore } from './patients'
import { exportJsonToXlsx } from '../utils/exporter'

const API_BASE = 'http://localhost:3001/api'

export const useTestsStore = defineStore('tests', {
  state: () => ({
    basic: {
      name: '动态对比敏感度检测',
      bgRgb: '128,128,128',
      bgLuminance: 50,
      gratingSizeDeg: 5,
      orientation: 'vertical',
      gratingGray: 128,
      avgLuminance: 50,
      distanceCm: 60,
      screenW: 50,
      screenH: 30,
      moduleGapSec: 1,
      order: 'ordered', // ordered 或 random
      resultReversalN: 6,
      showParams: true,
      mode: 'auto',
    },
    modules: [],
    eye: 'B', // L, R, B
    results: [],
    currentTestId: null, // 当前选中的测试方案ID
    testTemplates: [], // 所有测试方案列表
    loading: false,
  }),
  getters: {
    currentPatientText(){
      const p = usePatientsStore()
      const sel = p.all.find(x=>x.id===p.selectedId)
      if(!sel) return '未选择'
      return `${sel.name} 性别:${sel.gender} 生日:${sel.birthday} ID:${sel.id}`
    },
    selectedTestName(state){
      return state.basic?.name || '未设置'
    },
    // 获取模块显示顺序（根据order设置）
    moduleOrder(state){
      if(state.order === 'random'){
        return [...state.modules].sort(() => Math.random() - 0.5)
      }
      return state.modules
    }
  },
  actions: {
    // 加载默认测试方案
    async loadDefault(){
      this.loading = true
      try{
        const res = await fetch(`${API_BASE}/test-templates/default`)
        if(!res.ok){
          console.warn('loadDefault: 后端返回非200状态', res.status)
          return
        }
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '加载失败')
        if(data.data){
          this.loadTestData(data.data)
          this.currentTestId = data.data.id
        }
      } catch (e){
        console.error('loadDefault test error', e)
        // 如果加载失败，使用默认值
      } finally {
        this.loading = false
      }
    },
    // 加载测试方案数据到 state
    loadTestData(template){
      this.basic = {
        name: template.name || '',
        bgRgb: template.bg_rgb || '128,128,128',
        bgLuminance: template.bg_luminance || 50,
        gratingSizeDeg: template.grating_size_deg || 5,
        orientation: template.orientation || 'vertical',
        gratingGray: template.grating_gray || 128,
        avgLuminance: template.avg_luminance || 50,
        distanceCm: template.distance_cm || 60,
        screenW: template.screen_w_cm || 50,
        screenH: template.screen_h_cm || 30,
        moduleGapSec: template.module_gap_sec || 1,
        order: template.module_order || 'ordered',
        resultReversalN: template.result_reversalN || 6,
        showParams: template.show_params !== undefined ? template.show_params : true,
        mode: template.mode || 'auto',
      }
      // 加载模块
      if(template.modules && Array.isArray(template.modules)){
        this.modules = template.modules.map((m, idx) => ({
          id: m.id || Date.now() + idx,
          name: `模块${idx + 1}`,
          spatial: m.spatial_freq || 4,
          temporal: m.temporal_freq || 2,
          interval: m.interval_sec || 1,
          duration: m.duration_sec || 1,
          initialContrast: m.initial_contrast || 50,
          up: m.up_rule || 1,
          down: m.down_rule || 1,
          reversal: m.reversal_target || 10,
          stepCorrect: m.step_correct || 80,
          stepWrong: m.step_wrong || 120,
        }))
      } else {
        this.modules = []
      }
    },
    // 保存测试方案（新增或更新）
    async saveTest(isDefault = false){
      try{
        const modules = this.modules.map(m => ({
          spatial: m.spatial,
          temporal: m.temporal,
          interval: m.interval,
          duration: m.duration,
          initialContrast: m.initialContrast,
          up: m.up,
          down: m.down,
          reversal: m.reversal,
          stepCorrect: m.stepCorrect,
          stepWrong: m.stepWrong,
        }))
        
        const body = {
          name: this.basic.name,
          bgRgb: this.basic.bgRgb,
          bgLuminance: this.basic.bgLuminance,
          gratingSizeDeg: this.basic.gratingSizeDeg,
          orientation: this.basic.orientation,
          gratingGray: this.basic.gratingGray,
          avgLuminance: this.basic.avgLuminance,
          distanceCm: this.basic.distanceCm,
          screenW: this.basic.screenW,
          screenH: this.basic.screenH,
          moduleGapSec: this.basic.moduleGapSec,
          order: this.basic.order,
          resultReversalN: this.basic.resultReversalN,
          showParams: this.basic.showParams,
          mode: this.basic.mode,
          isDefault: isDefault,
          modules: modules,
        }
        
        let res
        if(this.currentTestId){
          // 更新
          res = await fetch(`${API_BASE}/test-templates/${this.currentTestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
        } else {
          // 新增
          res = await fetch(`${API_BASE}/test-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
        }
        
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '保存失败')
        
        if(data.data && data.data.id){
          this.currentTestId = data.data.id
        }
        
        return { ok: true }
      } catch (e){
        console.error('saveTest error', e)
        alert('保存测试方案失败：' + (e.message || '请检查后端服务'))
        return { ok: false, error: e.message }
      }
    },
    // 加载所有测试方案列表
    async loadTestTemplates(){
      try{
        const res = await fetch(`${API_BASE}/test-templates`)
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '加载失败')
        this.testTemplates = data.data || []
      } catch (e){
        console.error('loadTestTemplates error', e)
      }
    },
    // 加载指定测试方案
    async loadTestById(id){
      try{
        const res = await fetch(`${API_BASE}/test-templates/${id}`)
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '加载失败')
        this.loadTestData(data.data)
        this.currentTestId = id
      } catch (e){
        console.error('loadTestById error', e)
        alert('加载测试方案失败：' + (e.message || '请检查后端服务'))
      }
    },
    // 删除测试方案
    async remove(){
      if(!this.currentTestId) {
        alert('没有选中的测试方案')
        return
      }
      if(!confirm('确定要删除当前测试方案吗？')) return
      
      try{
        const res = await fetch(`${API_BASE}/test-templates/${this.currentTestId}`, {
          method: 'DELETE'
        })
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '删除失败')
        
        // 清空当前测试
        this.currentTestId = null
        this.resetBasic()
        this.modules = []
        
        // 重新加载默认测试
        await this.loadDefault()
      } catch (e){
        console.error('remove test error', e)
        alert('删除测试方案失败：' + (e.message || '请检查后端服务'))
      }
    },
    resetBasic(){
      this.basic = { ...this.basic, name:'', bgRgb:'128,128,128', mode:'auto' }
    },
    addModule(){
      const id = Date.now()
      this.modules.push({ 
        id, 
        name: `模块${this.modules.length + 1}`, 
        spatial: 4, 
        temporal: 2, 
        interval: 1, 
        duration: 1, 
        initialContrast: 50, 
        up: 1, 
        down: 1, 
        reversal: 10, 
        stepCorrect: 80, 
        stepWrong: 120 
      })
      return id
    },
    removeModule(id){ this.modules = this.modules.filter(m=>m.id!==id) },
    // 提交所有测试信息（保存测试方案）
    async saveModules(){
      if(!this.basic.name){
        alert('请先填写测试名称')
        return
      }
      const result = await this.saveTest(true) // 保存为默认测试方案
      if(result.ok){
        alert('保存成功！')
      }
    },
    // 加载测试结果列表
    async loadResults(patientId){
      try{
        const res = await fetch(`${API_BASE}/test-sessions${patientId ? '?patientId=' + patientId : ''}`)
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '加载失败')
        // 转换格式以兼容前端显示
        this.results = (data.data || []).map(r => ({
          id: r.id,
          patientId: r.patient_id,
          testName: r.test_name,
          eye: r.eye,
          mode: r.mode,
          time: r.started_at ? new Date(r.started_at).toLocaleString() : '',
          startedAt: r.started_at,
          finishedAt: r.finished_at
        }))
      } catch (e){
        console.error('loadResults error', e)
      }
    },
    exportOne(id){
      const rec = this.results.find(x=>x.id===id)
      if(!rec) return
      // TODO: 从数据库加载完整数据并导出
      exportJsonToXlsx([rec], `结果_${id}.xlsx`)
    }
  }
})



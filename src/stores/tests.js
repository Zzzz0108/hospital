import { defineStore } from 'pinia'
import { usePatientsStore } from './patients'
import { exportJsonToXlsx } from '../utils/exporter'

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
      order: 'ordered',
      resultReversalN: 6,
      showParams: true,
    },
    modules: [],
    eye: 'B',
    results: [],
  }),
  getters: {
    currentPatientText(){
      const p = usePatientsStore()
      const sel = p.all.find(x=>x.id===p.selectedId)
      if(!sel) return '未选择'
      return `${sel.name} 性别:${sel.gender} 生日:${sel.birthday} ID:${sel.id}`
    }
  },
  actions: {
    saveBasic(){},
    resetBasic(){
      this.basic = { ...this.basic, name:'', bgRgb:'128,128,128' }
    },
    add(){},
    remove(){},
    updateSelected(){},
    addModule(){
      const id = Date.now()
      this.modules.push({ id, name: this.modules.length+1, spatial:4, temporal:2, interval:1, duration:1, initialContrast:50, up:1, down:1, reversal:10, stepCorrect:80, stepWrong:120 })
      return id
    },
    removeModule(id){ this.modules = this.modules.filter(m=>m.id!==id) },
    saveModules(){},
    exportOne(id){
      const rec = this.results.find(x=>x.id===id)
      if(!rec) return
      exportJsonToXlsx([rec], `结果_${id}.xlsx`)
    }
  }
})



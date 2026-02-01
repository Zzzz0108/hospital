<script setup>
import { onMounted, watch } from 'vue'
import { useTestsStore } from '../stores/tests'
import { usePatientsStore } from '../stores/patients'
import { useRouter } from 'vue-router'

const store = useTestsStore()
const patientsStore = usePatientsStore()
const router = useRouter()

// 加载测试结果的函数
const loadTestResults = async () => {
  // 如果有选中的患者，加载该患者的测试结果；否则加载所有测试结果
  await store.loadResults(patientsStore.selectedId || null)
}

// 组件挂载时加载测试方案列表、默认测试方案和所有测试结果
onMounted(async () => {
  await store.loadTestTemplates()
  await store.loadDefault()
  await loadTestResults()
})

// 监听患者选择变化，当患者被选中或取消选中时，重新加载测试结果
watch(() => patientsStore.selectedId, async (newId) => {
  await loadTestResults()
})
</script>

<template>
  <div>
    <div style="margin-bottom:8px;">已选被试：{{store.currentPatientText}}</div>
    <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;">
      <span>测试名称</span>
      <el-select
        v-model="store.currentTestId"
        placeholder="请选择测试方案"
        size="large"
        style="max-width:320px;flex:1;"
        @change="(id) => id && store.loadTestById(id)"
      >
        <el-option
          v-for="t in store.testTemplates"
          :key="t.id"
          :label="t.name"
          :value="t.id"
        />
      </el-select>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <el-button @click="() => router.push({ path: '/config', query: { mode: 'update' } })">更改选定测试</el-button>
      <el-button @click="() => router.push({ path: '/config', query: { mode: 'create' } })">新增测试</el-button>
      <el-button type="danger" @click="store.remove">删除选定测试</el-button>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <span>眼别选择：</span>
      <el-radio-group v-model="store.eye">
        <el-radio label="L">左眼</el-radio>
        <el-radio label="R">右眼</el-radio>
        <el-radio label="B">双眼</el-radio>
      </el-radio-group>
    </div>
    <div style="display:flex;justify-content:center;margin-bottom:12px;">
      <el-button type="primary" size="large" @click="() => router.push('/run')">开始测试</el-button>
    </div>

    <div style="border:1px solid #ddd;padding:8px;">
      <h4 style="margin:0 0 8px 0;text-align:center;">已完成测试</h4>
      <div style="max-height:300px;overflow-y:auto;overflow-x:auto;">
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;">
          <thead style="position:sticky;top:0;background:#f5f5f5;z-index:1;">
            <tr><th>序号</th><th>时间</th><th>模式</th><th>眼别</th><th>导出</th></tr>
          </thead>
        <tbody>
          <tr v-for="(r,i) in store.results" :key="r.id">
            <td>{{i+1}}</td><td>{{r.time}}</td><td>{{r.mode}}</td><td>{{r.eye}}</td>
            <td><button @click="() => store.exportOne(r.id)">导出</button></td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>

<style scoped></style>



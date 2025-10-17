<script setup>
import TestBasicForm from '../widgets/TestBasicForm.vue'
import ModuleEditor from '../widgets/ModuleEditor.vue'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTestsStore } from '../stores/tests'

const route = useRoute()
const router = useRouter()
const store = useTestsStore()

const selectedModuleId = ref(null)
const activeTab = ref('basic')

// 初始化：根据 query.mode 及现有模块决定默认选中
if (store.modules.length === 0) {
  // 若无模块，先建一个
  selectedModuleId.value = store.addModule()
} else {
  selectedModuleId.value = store.modules[0].id
}

watch(() => route.query.mode, (m) => {
  // create 模式时，自动切到模块+ 新增并选中新模块
  if (m === 'create') {
    selectedModuleId.value = store.addModule()
    activeTab.value = `module-${selectedModuleId.value}`
  } else {
    activeTab.value = 'basic'
  }
}, { immediate: true })

function goBack(){ router.push('/') }

</script>

<template>
  <div class="cfg-wrap">
    <el-card shadow="never" class="cfg-card">
      <div class="cfg-header">
        <el-tabs v-model="activeTab" type="card" class="cfg-tabs" @tab-change="(name)=>{ if(name==='add'){ const nid = store.addModule(); selectedModuleId.value ? selectedModuleId.value=nid : selectedModuleId=nid; activeTab=`module-${nid}` } }">
          <el-tab-pane label="测试信息" name="basic" />
          <el-tab-pane v-for="m in store.modules" :key="m.id" :label="`模块${m.name}`" :name="`module-${m.id}`" />
          <el-tab-pane label="模块 +" name="add" />
        </el-tabs>
        <div class="actions">
          <el-button type="success" @click="store.saveModules">提交所有测试信息</el-button>
          <el-button @click="goBack">返回主界面</el-button>
        </div>
      </div>

      <div class="cfg-body">
        <div v-show="activeTab==='basic'" class="pane">
          <TestBasicForm />
        </div>
        <div v-for="m in store.modules" :key="m.id" v-show="activeTab===`module-${m.id}`" class="pane">
          <ModuleEditor v-model:selected-id="selectedModuleId" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.cfg-wrap{
  padding: 20px;
  display: flex;
  justify-content: center;
}
.cfg-card{
  width: 1180px; /* 适配 1920/1366 下的视觉宽度 */
}
.cfg-header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cfg-tabs{ flex:1; }
.cfg-header .actions{
  display: flex;
  gap: 8px;
}
.cfg-body{ padding-top: 12px; }
.pane{ padding: 8px 4px; }
</style>

<style scoped>
h3{margin:0 0 8px 0}
</style>



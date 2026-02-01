<script setup>
import { ref, onMounted } from 'vue'
import { usePatientsStore } from '../stores/patients'

const store = usePatientsStore()
const form = ref({ name:'', gender:'', birthday:'', id:'' })
const editing = ref(false)

// 使用 Element Plus 内置的当前行功能
const tableRef = ref()

function reset(){ form.value = { name:'', gender:'', birthday:'', id:'' } }
function add(){ store.add(form.value); reset(); editing.value=false }
function search(){ store.search(form.value) }
function startEdit(){
  const sel = store.all.find(x=>x.id===store.selectedId)
  if(!sel) return
  form.value = { name: sel.name, gender: sel.gender, birthday: sel.birthday, id: sel.id }
  editing.value = true
}
function saveEdit(){ store.updateSelected(form.value); reset(); editing.value=false }
function cancelEdit(){ reset(); editing.value=false }
function remove(){ store.removeSelected(); editing.value=false }

// 行点击处理 - 简化
const handleRowClick = (row) => {
  if (store.selectedId === row.id) {
    clearSelectionAll()
  } else {
    store.select(row.id)
    tableRef.value?.setCurrentRow(row)
  }
}

function clearSelectionAll(){
  store.clearSelection()
  tableRef.value?.setCurrentRow()
}

// 组件挂载时从后端加载患者列表
onMounted(() => {
  store.loadAll()
})
</script>

<template>
    <!-- 表单部分保持不变 -->
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        <el-form label-width="80px" :inline="false">
          <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="性别"><el-input v-model="form.gender" /></el-form-item>
          <el-form-item label="生日"><el-input v-model="form.birthday" placeholder="YYYY-MM-DD" /></el-form-item>
          <el-form-item label="ID号"><el-input v-model="form.id" /></el-form-item>
        </el-form>
      </div>
      <div class="btn-col" style="display:flex;flex-direction:column;width:120px;">
        <el-button type="primary" class="btn-compact" @click="add">新增</el-button>
        <template v-if="editing">
          <el-button class="btn-compact" type="success" @click="saveEdit">保存</el-button>
          <el-button class="btn-compact" @click="cancelEdit">取消</el-button>
        </template>
        <template v-else>
          <el-button class="btn-compact" @click="startEdit">修改</el-button>
        </template>
        <el-button class="btn-compact" @click="search">搜索</el-button>
        <el-button type="danger" class="btn-compact" @click="remove">删除</el-button>
      </div>
    </div>
    
    <!-- 表格部分 - 使用 Element Plus 内置功能 -->
    <div style="margin-top:12px;" @click="clearSelectionAll">
      <h4 style="margin:4px 0; text-align:center;">患者列表</h4>
      <div @click.stop>
        <el-table 
          ref="tableRef"
          :data="store.filtered" 
          height="260" 
          :current-row-key="store.selectedId"
          @row-click="handleRowClick"
          highlight-current-row
        >
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="gender" label="性别" />
          <el-table-column prop="birthday" label="生日" />
          <el-table-column prop="id" label="ID号" />
        </el-table>
      </div>
    </div>
</template>

<style scoped>
/* 纵向按钮列需要去掉 Element Plus 默认的相邻按钮左外边距 */
.btn-col :deep(.el-button + .el-button){
  margin-left: 0 !important;
}
.btn-col{ gap:18px; }
.btn-compact :deep(.el-button__text){ line-height: 30px; }
.btn-compact{ height:32px; padding: 0 12px; }

/* 表格选中行颜色加深，未选中为灰底 */
:deep(.el-table__body tr.current-row>td){
  background-color: #409eff !important;
  color: #fff !important;
}
:deep(.el-table__body tr>td){
  background-color: #f2f2f2;
}
</style>
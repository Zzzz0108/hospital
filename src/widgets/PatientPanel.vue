<script setup>
import { ref } from 'vue'
import { usePatientsStore } from '../stores/patients'

const store = usePatientsStore()
const form = ref({ name:'', gender:'', birthday:'', id:'' })

// 使用 Element Plus 内置的当前行功能
const tableRef = ref()

function reset(){ form.value = { name:'', gender:'', birthday:'', id:'' } }
function add(){ store.add(form.value); reset() }
function search(){ store.search(form.value) }
function update(){ store.updateSelected(form.value); reset() }
function remove(){ store.removeSelected() }

// 行点击处理 - 简化
const handleRowClick = (row) => {
  if (store.selectedId === row.id) {
    store.clearSelection()
  } else {
    store.select(row.id)
  }
}
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
      <div style="display:flex;flex-direction:column;gap:8px;width:120px;">
        <el-button type="primary" size="large" @click="add">新增</el-button>
        <el-button size="large" @click="update">修改</el-button>
        <el-button size="large" @click="search">搜索</el-button>
        <el-button type="danger" size="large" @click="remove">删除</el-button>
      </div>
    </div>
    
    <!-- 表格部分 - 使用 Element Plus 内置功能 -->
    <div style="margin-top:12px;" @click.self="store.clearSelection">
      <h4 style="margin:4px 0; text-align:center;">患者列表</h4>
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
      <!-- 分页部分 -->
    </div>
</template>

<style scoped>
/* 不需要额外的样式，Element Plus 会自动处理 */
</style>
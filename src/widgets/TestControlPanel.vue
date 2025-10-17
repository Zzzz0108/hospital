<script setup>
import { useTestsStore } from '../stores/tests'
import { useRouter } from 'vue-router'

const store = useTestsStore()
const router = useRouter()
</script>

<template>
  <div>
    <div style="margin-bottom:8px;">已选被试：{{store.currentPatientText}}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <button @click="() => router.push({ path: '/config', query: { mode: 'update' } })">更改选定测试</button>
      <button @click="() => router.push({ path: '/config', query: { mode: 'create' } })">新增测试</button>
      <button @click="store.remove">删除测试</button>
      <label>眼别
        <select v-model="store.eye">
          <option value="L">左</option>
          <option value="R">右</option>
          <option value="B">双眼</option>
        </select>
      </label>
      <button @click="() => router.push('/run')">开始测试</button>
    </div>

    <div style="border:1px solid #ddd;padding:8px;">
      <h4 style="margin:0 0 8px 0;">已完成测试</h4>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;">
        <thead><tr><th>序号</th><th>时间</th><th>模式</th><th>眼别</th><th>导出</th></tr></thead>
        <tbody>
          <tr v-for="(r,i) in store.results" :key="r.id">
            <td>{{i+1}}</td><td>{{r.time}}</td><td>{{r.mode}}</td><td>{{r.eye}}</td>
            <td><button @click="() => store.exportOne(r.id)">导出</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped></style>



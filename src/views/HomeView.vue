<script setup>
import PatientPanel from '../widgets/PatientPanel.vue'
import TestControlPanel from '../widgets/TestControlPanel.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div style="padding:16px;">
    <div style="display:flex;justify-content:flex-start;align-items:center;margin-bottom:12px;">
      <h2 style="margin:0;">动态对比敏感度检测</h2>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <section style="border:1px solid #ccc;padding:12px;">
        <h3 style="text-align:center;">患者信息</h3>
        <PatientPanel />
      </section>
      <section style="border:1px solid #ccc;padding:12px;">
        <h3 style="text-align:center;">测试控制</h3>
        <TestControlPanel />
      </section>
    </div>
  </div>
</template>

<style scoped>
h3{margin:0 0 8px 0}
</style>



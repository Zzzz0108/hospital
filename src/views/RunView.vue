<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRunStore } from '../stores/run'
import RunCanvas from '../widgets/RunCanvas.vue'
import { useRouter } from 'vue-router'

const runStore = useRunStore()
const phase = ref('ready')
const router = useRouter()

function onKey(e){
  if(e.code==='Space'){
    e.preventDefault()
    if(phase.value==='ready') phase.value='guide'
    else if(phase.value==='guide') phase.value='canvas'
  }
  if(e.code==='Escape'){
    if(phase.value!=='end') phase.value='end'
    else router.push('/')
  }
}

onMounted(()=>{ window.addEventListener('keydown', onKey) })
onBeforeUnmount(()=>{ window.removeEventListener('keydown', onKey) })
</script>

<template>
  <div style="height:100vh;background:#bfbfbf;display:flex;align-items:center;justify-content:center;">
    <div v-if="phase==='ready'" style="text-align:center;font-size:28px;">
      <span>测试准备开始</span><br />
      <span>点击“空格”继续</span>
    </div>
    <div v-else-if="phase==='guide'" style="text-align:center;font-size:24px;">
      <span>观察并判断图像中显示的光栅的运动方向</span><br />
      <span>对应按“上/下/左/右”</span><br />
      <span>点击“空格”继续</span>
    </div>
    <RunCanvas v-else-if="phase==='canvas'" />
    <div v-else style="text-align:center;font-size:28px;">
      <span>测试结束</span><br />
      <span>按“ESC”返回主界面</span>
    </div>
  </div>
</template>

<style scoped></style>



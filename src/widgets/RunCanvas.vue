<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const canvasRef = ref(null)
let rafId = null
let t = 0

function draw(ctx, w, h){
  ctx.fillStyle = '#bfbfbf'
  ctx.fillRect(0,0,w,h)
  const size = Math.min(w,h)*0.35
  const x0 = (w-size)/2
  const y0 = (h-size)/2
  const bars = 40
  for(let i=0;i<bars;i++){
    const x = x0 + (i/bars)*size
    const val = (i+t)%2===0?60:140
    ctx.fillStyle = `rgb(${val},${val},${val})`
    ctx.fillRect(x, y0, size/bars, size)
  }
  // 参数占位
  ctx.fillStyle = '#222'
  ctx.font = '16px system-ui'
  ctx.fillText('空间频率: 4c/d', w*0.2, h*0.8)
  ctx.fillText('时间频率: 2Hz',   w*0.45, h*0.8)
  ctx.fillText('对比度: 18%',    w*0.7, h*0.8)
}

function loop(){
  const c = canvasRef.value
  if(!c) return
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const rect = c.getBoundingClientRect()
  c.width = rect.width*dpr
  c.height = rect.height*dpr
  const ctx = c.getContext('2d')
  ctx.scale(dpr,dpr)
  draw(ctx, rect.width, rect.height)
  t = (t+1)%2
  rafId = requestAnimationFrame(loop)
}

onMounted(()=>{ rafId = requestAnimationFrame(loop) })
onBeforeUnmount(()=>{ if(rafId) cancelAnimationFrame(rafId) })
</script>

<template>
  <canvas ref="canvasRef" style="width:100vw;height:100vh;display:block;"></canvas>
</template>

<style scoped></style>



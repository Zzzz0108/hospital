<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRunStore } from '../stores/run'

const canvasRef = ref(null)
const runStore = useRunStore()
let rafId = null

// 使用符合物理参数的正弦光栅实现：正方形宽度由视角/距离决定，空间频率单位为 c/deg

const basic = computed(() => runStore.currentTest?.basic || {})
const moduleCfg = computed(() => runStore.currentModule || {})

// 空间频率：c/deg（每度视角内的周期数）
const spatialFreq = computed(() => Number(moduleCfg.value.spatial || 4))
// 时间频率：Hz（每秒周期数）
const temporalFreq = computed(() => Number(moduleCfg.value.temporal || 2))
// 对比度 0-1
const contrast = computed(() => {
  const c = Number(runStore.currentContrast || 50) / 100
  return Math.max(0, Math.min(1, c))
})

// 垂直 / 水平条纹（决定条纹是竖的还是横的）
const orientation = computed(() => basic.value.orientation || 'vertical')
// 当前运动方向（up/down/left/right），来自 stair-case 逻辑
const direction = computed(() => runStore.currentDirection || 'right')

// 背景颜色
const bgRgb = computed(() => {
  const rgb = (basic.value.bgRgb || '128,128,128').split(',').map(v => parseInt(v.trim(), 10))
  return {
    r: Number.isFinite(rgb[0]) ? rgb[0] : 128,
    g: Number.isFinite(rgb[1]) ? rgb[1] : 128,
    b: Number.isFinite(rgb[2]) ? rgb[2] : 128
  }
})

function draw(ctx, w, h, timeSec){
  // 背景
  ctx.fillStyle = `rgb(${bgRgb.value.r},${bgRgb.value.g},${bgRgb.value.b})`
  ctx.fillRect(0, 0, w, h)

  // -------- 1. 计算正方形宽度（像素） ----------
  // 测试距离 D（cm），光栅大小 theta（deg），屏幕物理宽度 screenW（cm）
  const D = Number(basic.value.distanceCm || 60)          // 测试距离
  const thetaDeg = Number(basic.value.gratingSizeDeg || 5) // 光栅大小（视角）
  const screenWcm = Number(basic.value.screenW || 50)     // 屏幕物理宽度

  // 屏幕整体视角（deg）：2 * atan((screenW/2)/D)
  const screenWidthRad = 2 * Math.atan((screenWcm / 2) / D)
  const screenWidthDeg = screenWidthRad * 180 / Math.PI

  // 每度视角对应的像素数（假设像素横向均匀）
  const pixPerDeg = screenWidthDeg > 0 ? w / screenWidthDeg : w / 60 // 兜底 60deg

  // 光栅宽度（deg）→ 像素： Wpx = thetaDeg * pixPerDeg
  let size = thetaDeg * pixPerDeg
  // 防止过大/过小：限制在窗口短边的 10%~90% 之间
  const maxSize = Math.min(w, h) * 0.9
  const minSize = Math.min(w, h) * 0.1
  size = Math.max(minSize, Math.min(maxSize, size))
  size = Math.floor(size)

  const x0 = (w - size) / 2
  const y0 = (h - size) / 2

  const sf = spatialFreq.value || 1
  const tf = temporalFreq.value || 0
  const c = contrast.value

  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // 像素坐标（相对于正方形中心）
      const xPix = px - size / 2
      const yPix = py - size / 2

      // 转为视角坐标（deg）
      const xDeg = xPix / pixPerDeg
      const yDeg = yPix / pixPerDeg

      // 条纹方向：垂直条纹→沿 x 方向变化；水平条纹→沿 y 方向变化
      const coordDeg = orientation.value === 'vertical' ? xDeg : yDeg

      // 根据当前方向决定运动方向：
      // 垂直光栅：left/right 控制水平方向；水平光栅：up/down 控制垂直方向
      let motionSign = 1
      if (orientation.value === 'vertical') {
        // 实测校正：让“right”视觉上向右漂，“left”向左漂
        if (direction.value === 'left') motionSign = 1
        if (direction.value === 'right') motionSign = -1
      } else {
        // 实测校正：让“up”视觉上向上漂，“down”向下漂
        if (direction.value === 'up') motionSign = -1
        if (direction.value === 'down') motionSign = 1
      }

      // 相位：2π * 空间频率(c/deg) * 视角坐标 + 2π * 时间频率 * 时间 * 方向符号
      const phase = 2 * Math.PI * sf * coordDeg + 2 * Math.PI * tf * timeSec * motionSign

      // 正弦波：-1~1 → 灰度 0~255，带对比度
      const base = 0.5 + 0.5 * Math.sin(phase) * c
      const gray = Math.max(0, Math.min(255, Math.round(base * 255)))

      const idx = (py * size + px) * 4
      data[idx] = gray
      data[idx + 1] = gray
      data[idx + 2] = gray
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imageData, x0, y0)
  
  // 显示提示信息
  ctx.fillStyle = '#222'
  ctx.font = '20px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('请判断光栅运动方向，按相应方向键：', w/2, h*0.15)
  
  ctx.font = '16px system-ui'
  ctx.fillText('↑ 上  ↓ 下  ← 左  → 右', w/2, h*0.2)
  
  // 参数显示（如果配置显示）
  if(basic.value.showParams){
    ctx.font = '16px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`空间频率: ${spatialFreq.value} c/d`, w*0.1, h*0.85)
    ctx.fillText(`时间频率: ${temporalFreq.value} Hz`, w*0.4, h*0.85)
    ctx.fillText(`对比度: ${(contrast.value * 100).toFixed(1)}%`, w*0.7, h*0.85)
  }
}

function loop(){
  const c = canvasRef.value
  if(!c || runStore.phase !== 'canvas') return
  
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const rect = c.getBoundingClientRect()
  c.width = rect.width * dpr
  c.height = rect.height * dpr
  const ctx = c.getContext('2d')
  // 重置变换矩阵，避免多次累积缩放导致绘制区域跑飞
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const now = performance.now() / 1000 // 秒
  draw(ctx, rect.width, rect.height, now)

  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if(rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas ref="canvasRef" style="width:100vw;height:100vh;display:block;"></canvas>
</template>

<style scoped></style>



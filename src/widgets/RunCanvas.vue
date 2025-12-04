<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRunStore } from '../stores/run'

const canvasRef = ref(null)
const runStore = useRunStore()
let rafId = null
let frameCount = 0
let startTime = Date.now()
let initialPhase = Math.random() * Math.PI * 2 // 随机初始相位
let lastTrial = 0 // 跟踪试验变化

// 获取屏幕刷新率（默认60Hz）
const refreshRate = 60
let actualRefreshRate = refreshRate

// 计算实际刷新率
function measureRefreshRate(){
  let lastTime = performance.now()
  let frames = 0
  function check(){
    frames++
    const now = performance.now()
    if(now - lastTime >= 1000){
      actualRefreshRate = frames
      frames = 0
      lastTime = now
    }
    requestAnimationFrame(check)
  }
  requestAnimationFrame(check)
}

// 测试参数
const basic = computed(() => runStore.currentTest?.basic || {})
const module = computed(() => runStore.currentModule || {})
const spatialFreq = computed(() => module.value.spatial || 4) // cycle/deg
const temporalFreq = computed(() => module.value.temporal || 2) // Hz
const contrast = computed(() => runStore.currentContrast / 100 || 0.5) // 0-1
const orientation = computed(() => basic.value.orientation || 'vertical') // vertical/horizontal
const direction = computed(() => runStore.currentDirection || 'up') // 运动方向
const avgLuminance = computed(() => basic.value.avgLuminance || 50) // cd/m2
const gratingSizeDeg = computed(() => basic.value.gratingSizeDeg || 5) // deg
const distanceCm = computed(() => basic.value.distanceCm || 60) // cm
const screenW = computed(() => basic.value.screenW || 50) // cm
const screenH = computed(() => basic.value.screenH || 30) // cm
const bgRgb = computed(() => {
  const rgb = (basic.value.bgRgb || '128,128,128').split(',').map(v => parseInt(v.trim()))
  return { r: rgb[0] || 128, g: rgb[1] || 128, b: rgb[2] || 128 }
})

// 计算光栅尺寸（像素）
const gratingSizePx = computed(() => {
  // 计算单位视角对应的像素数
  const screenWidthDeg = 2 * Math.atan((screenW.value / 2) / distanceCm.value) * (180 / Math.PI)
  const pixWidth = canvasRef.value?.width || window.innerWidth
  const pixPerDegree = pixWidth / screenWidthDeg
  
  // 光栅宽度（像素）= 2 * distance * tan(gratingSizeDeg/2) 对应的像素数
  const gratingSizeRad = (gratingSizeDeg.value / 2) * (Math.PI / 180)
  const gratingSizeCm = 2 * distanceCm.value * Math.tan(gratingSizeRad)
  const gratingSizePx = gratingSizeCm * (pixWidth / screenW.value)
  
  return Math.max(50, Math.min(gratingSizePx, Math.min(window.innerWidth, window.innerHeight) * 0.8))
})

// 计算条纹方向（rad）
const stripeOrientation = computed(() => {
  return orientation.value === 'vertical' ? Math.PI / 2 : 0
})

// 计算运动方向角度（rad）
const motionDirection = computed(() => {
  if(orientation.value === 'vertical'){
    // 垂直光栅：向右运动是0，向左运动是π
    if(direction.value === 'right') return 0
    if(direction.value === 'left') return Math.PI
    return 0 // 默认向右
  } else {
    // 水平光栅：向上运动是π/2，向下运动是-π/2
    if(direction.value === 'up') return Math.PI / 2
    if(direction.value === 'down') return -Math.PI / 2
    return Math.PI / 2 // 默认向上
  }
})

// 计算亮度（Michelson公式）
function calculateLuminance(xDeg, yDeg, t){
  // 计算空间相位：光栅条纹方向上的位置
  const spatialPhase = 2 * Math.PI * spatialFreq.value * 
    (xDeg * Math.cos(stripeOrientation.value) + yDeg * Math.sin(stripeOrientation.value))
  
  // 计算时间相位
  const temporalPhase = 2 * Math.PI * temporalFreq.value * t
  
  // 计算运动相位：根据运动方向调整
  let motionPhase = 0
  if(orientation.value === 'vertical'){
    // 垂直光栅：水平运动
    if(motionDirection.value === 0) motionPhase = spatialFreq.value * temporalFreq.value * t // 向右
    else if(motionDirection.value === Math.PI) motionPhase = -spatialFreq.value * temporalFreq.value * t // 向左
  } else {
    // 水平光栅：垂直运动
    if(motionDirection.value === Math.PI / 2) motionPhase = spatialFreq.value * temporalFreq.value * t // 向上
    else if(motionDirection.value === -Math.PI / 2) motionPhase = -spatialFreq.value * temporalFreq.value * t // 向下
  }
  
  // 总相位
  const phase = initialPhase + spatialPhase + temporalPhase + motionPhase * 2 * Math.PI
  
  const gratingValue = Math.sin(phase)
  
  // Michelson公式：C = (Lmax - Lmin) / (Lmax + Lmin)
  // Lmean = (Lmax + Lmin) / 2
  // 所以：Lmax = Lmean * (1 + C), Lmin = Lmean * (1 - C)
  const Lmax = avgLuminance.value * (1 + contrast.value)
  const Lmin = avgLuminance.value * (1 - contrast.value)
  
  // 将gratingValue从[-1,1]映射到[Lmin, Lmax]
  const luminance = Lmin + (gratingValue + 1) / 2 * (Lmax - Lmin)
  
  return luminance
}

// 将亮度转换为RGB（简化：假设是灰度）
function luminanceToRGB(luminance){
  // 简化转换：将cd/m2转换为0-255的灰度值
  // 这里使用线性映射，实际可能需要gamma校正
  const normalized = Math.max(0, Math.min(1, luminance / 100))
  const gray = Math.floor(normalized * 255)
  return { r: gray, g: gray, b: gray }
}

function draw(ctx, w, h){
  // 绘制背景
  ctx.fillStyle = `rgb(${bgRgb.value.r},${bgRgb.value.g},${bgRgb.value.b})`
  ctx.fillRect(0, 0, w, h)
  
  // 计算光栅位置（居中）
  const size = gratingSizePx.value
  const x0 = (w - size) / 2
  const y0 = (h - size) / 2
  
  // 计算像素到视角的转换
  const screenWidthDeg = 2 * Math.atan((screenW.value / 2) / distanceCm.value) * (180 / Math.PI)
  const pixPerDegree = w / screenWidthDeg
  
  // 计算时间 t（秒）
  const t = frameCount / actualRefreshRate
  
  // 绘制光栅（逐像素绘制）
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data
  
  for(let py = 0; py < size; py++){
    for(let px = 0; px < size; px++){
      // 像素坐标（相对于canvas中心）
      const xPix = px + x0 - w/2
      const yPix = h/2 - (py + y0) // 注意Y轴翻转
      
      // 转换为视角坐标（deg）
      const xDeg = xPix / pixPerDegree
      const yDeg = yPix / pixPerDegree
      
      // 计算亮度
      const luminance = calculateLuminance(xDeg, yDeg, t)
      const rgb = luminanceToRGB(luminance)
      
      // 写入像素数据
      const idx = (py * size + px) * 4
      data[idx] = rgb.r
      data[idx + 1] = rgb.g
      data[idx + 2] = rgb.b
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
  
  // 检测新试验开始，重置初始相位
  if(runStore.currentTrial !== lastTrial){
    initialPhase = Math.random() * Math.PI * 2
    frameCount = 0
    startTime = Date.now()
    lastTrial = runStore.currentTrial
  }
  
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const rect = c.getBoundingClientRect()
  c.width = rect.width * dpr
  c.height = rect.height * dpr
  const ctx = c.getContext('2d')
  ctx.scale(dpr, dpr)
  
  draw(ctx, rect.width, rect.height)
  
  frameCount++
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  measureRefreshRate()
  // 每次新试验重置初始相位
  initialPhase = Math.random() * Math.PI * 2
  frameCount = 0
  startTime = Date.now()
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



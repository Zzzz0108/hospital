<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRunStore } from '../stores/run'

const canvasRef = ref(null)
const runStore = useRunStore()
let rafId = null

// 使用符合物理参数的正弦光栅实现：正方形宽度由视角/距离决定，空间频率单位为 c/deg

// 直接从 testsStore 读取，确保能获取到最新的参数值
import { useTestsStore } from '../stores/tests'
const testsStore = useTestsStore()
const basic = computed(() => testsStore.basic || {})
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

function draw(ctx, actualSize, timeSec){
  // 如果是模块间隔期间，不绘制光栅
  if (runStore.phase === 'moduleGap') {
    // 清空 canvas
    ctx.clearRect(0, 0, actualSize, actualSize)
    return
  }

  // canvas 尺寸等于光栅尺寸，所以从 (0, 0) 开始绘制，填满整个 canvas
  const x0 = 0
  const y0 = 0

  const sf = spatialFreq.value || 1
  const tf = temporalFreq.value || 0
  const c = contrast.value

  // 计算每度视角对应的像素数（用于视角坐标转换）
  const distanceCm = Number(basic.value.distanceCm || 60)
  const screenWcm = Number(basic.value.screenW || 50)
  const screenWidthRad = 2 * Math.atan((screenWcm / 2) / distanceCm)
  const screenWidthDeg = screenWidthRad * 180 / Math.PI
  // 使用窗口宽度来计算像素密度
  const screenWpx = window.innerWidth
  const pixPerDeg = screenWidthDeg > 0 ? screenWpx / screenWidthDeg : screenWpx / 60

  // 使用实际像素尺寸创建图像数据
  const imageData = ctx.createImageData(actualSize, actualSize)
  const data = imageData.data

  for (let py = 0; py < actualSize; py++) {
    for (let px = 0; px < actualSize; px++) {
      // 像素坐标（相对于正方形中心）
      const xPix = px - actualSize / 2
      const yPix = py - actualSize / 2

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

      const idx = (py * actualSize + px) * 4
      data[idx] = gray
      data[idx + 1] = gray
      data[idx + 2] = gray
      data[idx + 3] = 255
    }
  }

  // 光栅绘制在 canvas 的 (0, 0) 位置，填满整个 canvas
  // putImageData 不受 transform 影响，直接绘制到实际像素
  ctx.putImageData(imageData, x0, y0)
}

function loop(){
  const c = canvasRef.value
  // 在 canvas 和 moduleGap 阶段都绘制
  if(!c || (runStore.phase !== 'canvas' && runStore.phase !== 'moduleGap')) return
  
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  
  // -------- 计算光栅正方形宽度（像素） ----------
  // 根据公式：宽度 = 2 * 测试距离 * tan(光栅大小/2)
  const distanceCm = Number(basic.value.distanceCm || 60)          // 测试距离（cm）
  const gratingSizeDeg = Number(basic.value.gratingSizeDeg || 5)    // 光栅大小（度）
  const screenWcm = Number(basic.value.screenW || 50)              // 屏幕物理宽度（cm）
  
  // 调试：输出读取到的参数值
  if (Math.random() < 0.01) { // 偶尔输出，避免刷屏
    console.log('[RunCanvas] 读取的参数:', {
      distanceCm,
      gratingSizeDeg,
      screenWcm,
      basicValue: basic.value
    })
  }
  
  // 光栅物理宽度（cm）：2 * distanceCm * tan(gratingSizeDeg / 2)
  const gratingSizeRad = (gratingSizeDeg / 2) * Math.PI / 180  // 转换为弧度
  const gratingSizeCm = 2 * distanceCm * Math.tan(gratingSizeRad)
  
  // 屏幕像素宽度（px），屏幕物理宽度 screenWcm（cm）
  // 像素密度 = screenWpx / screenWcm (px/cm)
  const screenWpx = window.innerWidth
  const pixelsPerCm = screenWpx / screenWcm
  
  // 光栅像素宽度 = 光栅物理宽度 * 像素密度
  let size = gratingSizeCm * pixelsPerCm
  
  // 调试：输出计算结果
  if (Math.random() < 0.01) {
    console.log('[RunCanvas] 计算结果:', {
      gratingSizeCm: gratingSizeCm.toFixed(2) + 'cm',
      pixelsPerCm: pixelsPerCm.toFixed(2) + 'px/cm',
      calculatedSize: size.toFixed(2) + 'px',
      screenWpx: screenWpx + 'px',
      formula: `2 * ${distanceCm}cm * tan(${gratingSizeDeg}°/2) * ${pixelsPerCm.toFixed(2)}px/cm`
    })
  }
  
  // 限制光栅大小：限制在窗口短边的 5%~95% 之间
  // 这样既能保证光栅可见，又能让不同参数产生明显区别
  const windowMin = Math.min(window.innerWidth, window.innerHeight)
  const maxSize = windowMin * 0.95  // 最大为窗口短边的 95%
  const minSize = windowMin * 0.05  // 最小为窗口短边的 5%
  const sizeBeforeLimit = size
  const wasLimited = size > maxSize || size < minSize
  
  if (size > maxSize) {
    size = maxSize
  } else if (size < minSize) {
    size = minSize
  }
  size = Math.floor(size)
  
  // 调试：输出限制后的最终尺寸（尺寸变化时输出）
  if (!window._lastGratingSize || Math.abs(window._lastGratingSize - size) > 1) {
    console.log('[RunCanvas] 限制后的尺寸:', {
      calculatedSize: sizeBeforeLimit.toFixed(2) + 'px',
      maxSize: maxSize.toFixed(2) + 'px',
      minSize: minSize.toFixed(2) + 'px',
      finalSize: size + 'px',
      windowSize: `${window.innerWidth}x${window.innerHeight}px`,
      canvasDisplaySize: `${size}px x ${size}px`,
      canvasActualSize: `${size * dpr}px x ${size * dpr}px (dpr=${dpr})`,
      isLimited: wasLimited ? `是（${sizeBeforeLimit > maxSize ? '超过最大值' : '小于最小值'}）` : '否（未限制）'
    })
    window._lastGratingSize = size
  }
  
  // Canvas 尺寸等于光栅尺寸（光栅填满整个 canvas）
  // 设置 canvas 的实际像素尺寸（考虑设备像素比）
  c.width = size * dpr
  c.height = size * dpr
  
  // 设置 canvas 的显示尺寸为光栅尺寸
  c.style.width = size + 'px'
  c.style.height = size + 'px'
  
  const ctx = c.getContext('2d')
  // 注意：putImageData 不受 transform 影响，所以我们需要直接使用实际像素尺寸
  // 不使用 setTransform，而是直接使用实际像素尺寸绘制
  
  const now = performance.now() / 1000 // 秒
  // 使用实际像素尺寸绘制，确保光栅填满整个 canvas
  const actualSize = size * dpr
  draw(ctx, actualSize, now)

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
  <canvas ref="canvasRef" class="grating-canvas"></canvas>
</template>

<style scoped>
.grating-canvas {
  display: block;
  /* canvas 尺寸会根据光栅大小动态设置，这里不需要固定尺寸 */
}
</style>



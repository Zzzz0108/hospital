<script setup>
import { useTestsStore } from '../stores/tests'
const store = useTestsStore()
</script>

<template>
  <el-form label-width="160px" class="tb-form" @submit.prevent>
    <div class="grid">
      <label>测试名称</label><el-input v-model="store.basic.name" size="large" />
      <label>测试距离(cm)</label><el-input v-model.number="store.basic.distanceCm" type="number" size="large" />
      <label>背景颜色(RGB)</label><el-input v-model="store.basic.bgRgb" placeholder="r,g,b" size="large" />
      <label>屏幕长度(cm)</label><el-input v-model.number="store.basic.screenW" type="number" size="large" />
      <label>背景亮度(lux)</label><el-input v-model.number="store.basic.bgLuminance" type="number" size="large" />
      <label>屏幕宽度(cm)</label><el-input v-model.number="store.basic.screenH" type="number" size="large" />
      <label>光栅大小(deg)</label><el-input v-model.number="store.basic.gratingSizeDeg" type="number" size="large" />
      <label>模块间隔时间(s)</label><el-input v-model.number="store.basic.moduleGapSec" type="number" size="large" />
      <label>光栅显示方向</label>
      <el-radio-group v-model="store.basic.orientation">
        <el-radio label="vertical">垂直</el-radio>
        <el-radio label="horizontal">水平</el-radio>
      </el-radio-group>
      <label>模块显示顺序</label>
      <el-radio-group v-model="store.basic.order">
        <el-radio label="ordered">按序</el-radio>
        <el-radio label="random">随机</el-radio>
      </el-radio-group>
      <label>光栅颜色(灰度)</label><el-input v-model.number="store.basic.gratingGray" type="number" size="large" />
      <label>结果计算(次数)</label><el-input v-model.number="store.basic.resultReversalN" type="number" size="large" />
      <label>平均亮度(lux)</label><el-input v-model.number="store.basic.avgLuminance" type="number" size="large" />
      <label>是否显示光栅参数</label>
      <el-radio-group v-model="store.basic.showParams">
        <el-radio :label="true">是</el-radio>
        <el-radio :label="false">否</el-radio>
      </el-radio-group>
      <label>测试方式</label>
      <el-radio-group v-model="store.basic.mode">
        <el-radio label="manual">手动</el-radio>
        <el-radio label="auto">自动</el-radio>
      </el-radio-group>
    </div>
    <div class="btns">
      <el-button type="primary" @click="store.saveBasic">保存</el-button>
      <el-button @click="store.resetBasic">重置</el-button>
    </div>
  </el-form>
</template>

<style scoped>
.tb-form{ font-size:16px; }
.grid{
  display:grid;
  grid-template-columns: 180px 1fr 180px 1fr;
  gap:16px 16px;
  align-items:center;
}
.tb-form :deep(.el-input__wrapper){ padding: 8px 12px; }
.btns{
  margin-top: 16px;
  display:flex;
  gap:12px;
  justify-content:flex-end; /* 右下角 */
}
</style>



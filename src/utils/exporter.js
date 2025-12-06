import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

export function exportJsonToXlsx(rows, filename){
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

// 辅助函数：设置单元格样式（居中对齐）
const setCellStyle = (cell) => {
  cell.alignment = { vertical: 'middle', horizontal: 'center' }
  cell.font = { name: 'Arial', size: 11 }
}

// 导出测试结果到Excel（按指定格式）
export async function exportTestResult(sessionId) {
  try {
    // 从后端获取完整数据
    const res = await fetch(`http://localhost:3001/api/test-sessions/${sessionId}/export`)
    
    // 检查响应状态
    if (!res.ok) {
      const text = await res.text()
      console.error('Export API error response:', text)
      throw new Error(`服务器返回错误 (${res.status}): ${res.statusText}`)
    }
    
    const data = await res.json()
    if (!data.ok) throw new Error(data.message || '获取数据失败')
    
    const { session, modules, moduleResults, trials } = data.data
    
    // 使用 ExcelJS 创建Excel工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('测试结果')
    
    // 定义列宽
    const colWidths = [12, 8, 12, 15, 12, 10, 12, 12, 12, 15, 12, 12, 12, 12, 12, 15, 15, 12, 10, 12, 12, 12, 12, 12, 15, 20]
    worksheet.columns = colWidths.map((width, index) => ({
      width,
      key: `col${index}`
    }))
    
    let rowIndex = 1 // ExcelJS 行号从1开始
    
    // 第一行：表头 - 姓名、性别、生日、ID号、测试方式、测试眼别
    const row1Headers = ['姓名', '性别', '生日', 'ID号', '测试方式', '测试眼别']
    row1Headers.forEach((h, i) => {
      const cell = worksheet.getCell(rowIndex, i + 1)
      cell.value = h
      setCellStyle(cell)
    })
    rowIndex++
    
    // 第二行：数据 - 姓名、性别、生日、ID号、测试方式、测试眼别
    const row1Data = [
      session.patient_name || '',
      session.gender || '',
      session.birthday ? new Date(session.birthday).toISOString().split('T')[0] : '',
      session.patient_id_str || session.patient_id || '',
      session.mode || '',
      session.eye || ''
    ]
    row1Data.forEach((d, i) => {
      const cell = worksheet.getCell(rowIndex, i + 1)
      cell.value = d
      setCellStyle(cell)
    })
    rowIndex++
    
    // 第三行：表头 - 背景颜色、背景亮度、光栅大小、光栅显示方向、光栅颜色、平均亮度
    const row2Headers = ['背景颜色', '背景亮度', '光栅大小', '光栅显示方向', '光栅颜色', '平均亮度']
    row2Headers.forEach((h, i) => {
      const cell = worksheet.getCell(rowIndex, i + 1)
      cell.value = h
      setCellStyle(cell)
    })
    rowIndex++
    
    // 第四行：数据 - 背景颜色、背景亮度、光栅大小、光栅显示方向、光栅颜色、平均亮度
    const row2Data = [
      session.bg_rgb || '',
      session.bg_luminance || '',
      session.grating_size_deg || '',
      session.orientation === 'vertical' ? '垂直' : '水平',
      session.grating_gray || '',
      session.avg_luminance || ''
    ]
    row2Data.forEach((d, i) => {
      const cell = worksheet.getCell(rowIndex, i + 1)
      cell.value = d
      setCellStyle(cell)
    })
    rowIndex++
    
    // 第五行：表头 - 测试距离、屏幕长度、屏幕宽度、模块间隔时间、模块显示顺序、结果计算
    const row3Headers = ['测试距离', '屏幕长度', '屏幕宽度', '模块间隔时间', '模块显示顺序', '结果计算']
    row3Headers.forEach((h, i) => {
      const cell = worksheet.getCell(rowIndex, i + 1)
      cell.value = h
      setCellStyle(cell)
    })
    rowIndex++
    
    // 第六行：数据 - 测试距离、屏幕长度、屏幕宽度、模块间隔时间、模块显示顺序、结果计算
    const row3Data = [
      session.distance_cm || '',
      session.screen_w_cm || '',
      session.screen_h_cm || '',
      session.module_gap_sec || '',
      session.module_order === 'ordered' ? '按序' : '随机',
      session.result_reversalN || ''
    ]
    row3Data.forEach((d, i) => {
      const cell = worksheet.getCell(rowIndex, i + 1)
      cell.value = d
      setCellStyle(cell)
    })
    rowIndex++
    
    // 空行
    rowIndex++
    
    // 按模块组织数据
    const moduleMap = new Map()
    modules.forEach(m => {
      const idx = m.module_index
      if (!moduleMap.has(idx)) {
        moduleMap.set(idx, { module: m, result: null, trials: [] })
      } else {
        moduleMap.get(idx).module = m
      }
    })
    
    moduleResults.forEach(r => {
      const idx = r.module_index
      if (!moduleMap.has(idx)) {
        moduleMap.set(idx, { module: null, result: r, trials: [] })
      } else {
        moduleMap.get(idx).result = r
      }
    })
    
    trials.forEach(t => {
      const idx = t.module_index
      if (!moduleMap.has(idx)) {
        moduleMap.set(idx, { module: null, result: null, trials: [t] })
      } else {
        moduleMap.get(idx).trials.push(t)
      }
    })
    
    // 按模块索引排序
    const sortedModules = Array.from(moduleMap.entries()).sort((a, b) => a[0] - b[0])
    
    sortedModules.forEach(([moduleIndex, data]) => {
      const { module, result, trials: moduleTrials } = data
      
      // 模块信息表头行（横向展示）
      const moduleHeaderLabels = ['模块', '空间频率', '时间频率', '间隔时间', '持续时间', '初始对比度', '切换逻辑', '切换梯度（正确/错误）']
      moduleHeaderLabels.forEach((label, i) => {
        const cell = worksheet.getCell(rowIndex, i + 1)
        cell.value = label
        setCellStyle(cell)
      })
      rowIndex++
      
      // 模块信息数据行（横向展示）
      const moduleData = [
        `模块${moduleIndex}`,
        module?.spatial_freq || '',
        module?.temporal_freq || '',
        module?.interval_sec || '',
        module?.duration_sec || '',
        module?.initial_contrast || '',
        module ? `${module.up_rule}up ${module.down_rule}down ${module.reversal_target}reversal` : '',
        module ? `${module.step_correct}%/${module.step_wrong}%` : ''
      ]
      moduleData.forEach((val, i) => {
        const cell = worksheet.getCell(rowIndex, i + 1)
        cell.value = val
        setCellStyle(cell)
      })
      rowIndex++
      
      // 测试结果标题行（跨列）
      const sortedTrials = moduleTrials.sort((a, b) => a.trial_index - b.trial_index)
      const trialCount = sortedTrials.length
      const startCol = 1
      const endCol = trialCount + 1 // 表头1列 + 数据列数
      
      const titleCell = worksheet.getCell(rowIndex, startCol)
      titleCell.value = '测试结果'
      setCellStyle(titleCell)
      worksheet.mergeCells(rowIndex, startCol, rowIndex, endCol)
      rowIndex++
      
      // 测试结果表头竖向排列（每个表头占一行，在第1列）
      const resultHeaderLabels = ['显示运动方向', '判断运动方向', '当前对比度', '判断正误', '对比度阈值']
      const headerStartRow = rowIndex
      resultHeaderLabels.forEach((label, i) => {
        const cell = worksheet.getCell(rowIndex, 1)
        cell.value = label
        setCellStyle(cell)
        rowIndex++
      })
      
      // 测试结果数据竖向排列（每个试验占一列，数据在对应表头行的右侧）
      sortedTrials.forEach((trial, trialIndex) => {
        const directionMap = {
          'up': '上',
          'down': '下',
          'left': '左',
          'right': '右'
        }
        const directionText = directionMap[trial.direction] || trial.direction
        const responseText = trial.response ? (directionMap[trial.response] || trial.response) : '未响应'
        
        // 数据列从第2列开始（第1列是表头）
        const dataCol = trialIndex + 2
        
        // 数据行从表头开始的行位置
        worksheet.getCell(headerStartRow, dataCol).value = directionText
        setCellStyle(worksheet.getCell(headerStartRow, dataCol))
        
        worksheet.getCell(headerStartRow + 1, dataCol).value = responseText
        setCellStyle(worksheet.getCell(headerStartRow + 1, dataCol))
        
        worksheet.getCell(headerStartRow + 2, dataCol).value = trial.contrast
        setCellStyle(worksheet.getCell(headerStartRow + 2, dataCol))
        
        worksheet.getCell(headerStartRow + 3, dataCol).value = trial.correct ? '正确' : '错误'
        setCellStyle(worksheet.getCell(headerStartRow + 3, dataCol))
        
        worksheet.getCell(headerStartRow + 4, dataCol).value = result?.threshold || ''
        setCellStyle(worksheet.getCell(headerStartRow + 4, dataCol))
      })
      
      // rowIndex 已经在表头循环后指向正确位置
      
      // 模块之间空一行
      rowIndex++
    })
    
    // 生成文件名
    const patientName = session.patient_name || '患者'
    const testDate = session.finished_at 
      ? new Date(session.finished_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    const filename = `测试结果_${patientName}_${testDate}.xlsx`
    
    // 生成文件并下载
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
    
    return { ok: true, filename }
  } catch (err) {
    console.error('exportTestResult error:', err)
    throw err
  }
}

const express = require('express')
const cors = require('cors')
const { query } = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
// 提高 JSON 请求体大小上限，避免保存测试结果时报 413
app.use(express.json({ limit: '2mb' }))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'production' })
})

// 新增患者
app.post('/api/patients', async (req, res) => {
  try {
    const { id, name, gender, birthday } = req.body || {}

    if (!name || !gender || !birthday) {
      return res.status(400).json({ ok: false, message: 'name、gender、birthday 为必填' })
    }

    // 如果前端没传 id，就用时间戳生成一个
    const finalId = id || String(Date.now())

    await query(
      'INSERT INTO patient (id, name, gender, birthday) VALUES (?,?,?,?)',
      [finalId, name, gender, birthday]
    )

    res.json({ ok: true, data: { id: finalId } })
  } catch (err) {
    console.error('POST /api/patients error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 获取患者列表（简单全部返回，后续可加分页、搜索）
app.get('/api/patients', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, gender, DATE_FORMAT(birthday, "%Y-%m-%d") as birthday FROM patient ORDER BY birthday DESC',
      []
    )
    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('GET /api/patients error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 更新患者
app.put('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params // 旧 ID
    const { id: newId, name, gender, birthday } = req.body || {}

    // 如果 ID 被修改了，需要先删除旧记录，再插入新记录（因为主键不能直接 UPDATE）
    if (newId && newId !== id) {
      // 检查新 ID 是否已存在
      const existing = await query('SELECT id FROM patient WHERE id = ?', [newId])
      if (existing.length > 0) {
        return res.status(400).json({ ok: false, message: `ID "${newId}" 已存在，请使用其他ID` })
      }
      
      // 先删除旧记录
      await query('DELETE FROM patient WHERE id = ?', [id])
      // 再插入新记录（使用新 ID）
      await query(
        'INSERT INTO patient (id, name, gender, birthday) VALUES (?,?,?,?)',
        [newId, name, gender, birthday]
      )
      res.json({ ok: true, data: { id: newId } })
    } else {
      // ID 没变，正常更新其他字段
      await query(
        'UPDATE patient SET name = ?, gender = ?, birthday = ? WHERE id = ?',
        [name, gender, birthday, id]
      )
      res.json({ ok: true, data: { id } })
    }
  } catch (err) {
    console.error('PUT /api/patients/:id error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 删除患者
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM patient WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/patients/:id error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// ========== 测试方案相关接口 ==========

// 获取所有测试方案列表
app.get('/api/test-templates', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, is_default, created_at, updated_at FROM test_template ORDER BY is_default DESC, created_at DESC',
      []
    )
    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('GET /api/test-templates error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 获取默认测试方案（包含模块）
app.get('/api/test-templates/default', async (req, res) => {
  try {
    const templates = await query(
      'SELECT * FROM test_template WHERE is_default = 1 LIMIT 1',
      []
    )
    if (templates.length === 0) {
      return res.json({ ok: true, data: null })
    }
    const template = templates[0]
    
    // 获取模块列表
    const modules = await query(
      'SELECT * FROM test_template_module WHERE test_template_id = ? ORDER BY module_index',
      [template.id]
    )
    
    res.json({ ok: true, data: { ...template, modules } })
  } catch (err) {
    console.error('GET /api/test-templates/default error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 获取单个测试方案（包含模块）
app.get('/api/test-templates/:id', async (req, res) => {
  try {
    const { id } = req.params
    const templates = await query('SELECT * FROM test_template WHERE id = ?', [id])
    if (templates.length === 0) {
      return res.status(404).json({ ok: false, message: '测试方案不存在' })
    }
    const template = templates[0]
    
    // 获取模块列表
    const modules = await query(
      'SELECT * FROM test_template_module WHERE test_template_id = ? ORDER BY module_index',
      [id]
    )
    
    res.json({ ok: true, data: { ...template, modules } })
  } catch (err) {
    console.error('GET /api/test-templates/:id error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 新增测试方案
app.post('/api/test-templates', async (req, res) => {
  try {
    const { name, bgRgb, bgLuminance, gratingSizeDeg, orientation, gratingGray, avgLuminance,
            distanceCm, screenW, screenH, moduleGapSec, order, resultReversalN, showParams, mode,
            isDefault, modules } = req.body || {}
    
    if (!name) {
      return res.status(400).json({ ok: false, message: '测试名称不能为空' })
    }
    
    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await query('UPDATE test_template SET is_default = 0', [])
    }
    
    // 插入测试方案
    const result = await query(
      `INSERT INTO test_template (name, bg_rgb, bg_luminance, grating_size_deg, orientation, 
       grating_gray, avg_luminance, distance_cm, screen_w_cm, screen_h_cm, module_gap_sec, 
       module_order, result_reversalN, show_params, mode, is_default) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, bgRgb || '128,128,128', bgLuminance || 50, gratingSizeDeg || 5, 
       orientation || 'vertical', gratingGray || 128, avgLuminance || 50,
       distanceCm || 60, screenW || 50, screenH || 30, moduleGapSec || 1,
       order || 'ordered', resultReversalN || 6, showParams !== undefined ? showParams : 1,
       mode || 'auto', isDefault ? 1 : 0]
    )
    
    const templateId = result.insertId
    
    // 插入模块
    if (modules && Array.isArray(modules)) {
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i]
        await query(
          `INSERT INTO test_template_module (test_template_id, module_index, spatial_freq, 
           temporal_freq, interval_sec, duration_sec, initial_contrast, up_rule, down_rule, 
           reversal_target, step_correct, step_wrong) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [templateId, i + 1, m.spatial || 4, m.temporal || 2, m.interval || 1, 
           m.duration || 1, m.initialContrast || 50, m.up || 1, m.down || 1,
           m.reversal || 10, m.stepCorrect || 80, m.stepWrong || 120]
        )
      }
    }
    
    res.json({ ok: true, data: { id: templateId } })
  } catch (err) {
    console.error('POST /api/test-templates error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 更新测试方案
app.put('/api/test-templates/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, bgRgb, bgLuminance, gratingSizeDeg, orientation, gratingGray, avgLuminance,
            distanceCm, screenW, screenH, moduleGapSec, order, resultReversalN, showParams, mode,
            isDefault, modules } = req.body || {}
    
    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await query('UPDATE test_template SET is_default = 0 WHERE id != ?', [id])
    }
    
    // 更新测试方案基本信息
    await query(
      `UPDATE test_template SET name = ?, bg_rgb = ?, bg_luminance = ?, grating_size_deg = ?, 
       orientation = ?, grating_gray = ?, avg_luminance = ?, distance_cm = ?, screen_w_cm = ?, 
       screen_h_cm = ?, module_gap_sec = ?, module_order = ?, result_reversalN = ?, 
       show_params = ?, mode = ?, is_default = ? WHERE id = ?`,
      [name, bgRgb, bgLuminance, gratingSizeDeg, orientation, gratingGray, avgLuminance,
       distanceCm, screenW, screenH, moduleGapSec, order, resultReversalN, showParams, mode,
       isDefault ? 1 : 0, id]
    )
    
    // 删除旧模块，重新插入
    await query('DELETE FROM test_template_module WHERE test_template_id = ?', [id])
    if (modules && Array.isArray(modules)) {
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i]
        await query(
          `INSERT INTO test_template_module (test_template_id, module_index, spatial_freq, 
           temporal_freq, interval_sec, duration_sec, initial_contrast, up_rule, down_rule, 
           reversal_target, step_correct, step_wrong) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, i + 1, m.spatial || 4, m.temporal || 2, m.interval || 1, 
           m.duration || 1, m.initialContrast || 50, m.up || 1, m.down || 1,
           m.reversal || 10, m.stepCorrect || 80, m.stepWrong || 120]
        )
      }
    }
    
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/test-templates/:id error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 删除测试方案
app.delete('/api/test-templates/:id', async (req, res) => {
  try {
    const { id } = req.params
    // 外键会自动级联删除模块
    await query('DELETE FROM test_template WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/test-templates/:id error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 设置为默认测试方案
app.put('/api/test-templates/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params
    // 先取消所有默认
    await query('UPDATE test_template SET is_default = 0', [])
    // 设置当前为默认
    await query('UPDATE test_template SET is_default = 1 WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/test-templates/:id/set-default error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// ========== 测试结果相关接口 ==========

// 保存测试结果
app.post('/api/test-sessions', async (req, res) => {
  try {
    const { patientId, testTemplateId, testName, eye, mode, basic, modules, moduleResults, trials, totalDuration } = req.body || {}
    
    if (!patientId || !testName) {
      return res.status(400).json({ ok: false, message: 'patientId 和 testName 为必填' })
    }
    
    // 插入 test_session
    const sessionResult = await query(
      `INSERT INTO test_session (patient_id, test_template_id, test_name, eye, mode,
       bg_rgb, bg_luminance, grating_size_deg, orientation, grating_gray, avg_luminance,
       distance_cm, screen_w_cm, screen_h_cm, module_gap_sec, module_order, result_reversalN, show_params,
       total_duration_ms, finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
      [patientId, testTemplateId || null, testName, eye, mode,
       basic.bgRgb, basic.bgLuminance, basic.gratingSizeDeg, basic.orientation, basic.gratingGray, basic.avgLuminance,
       basic.distanceCm, basic.screenW, basic.screenH, basic.moduleGapSec, basic.order, basic.resultReversalN, basic.showParams ? 1 : 0,
       totalDuration || null]
    )
    
    const sessionId = sessionResult.insertId
    
    // 插入模块配置快照和结果
    if (modules && moduleResults && Array.isArray(modules)) {
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i]
        const result = moduleResults[i]
        
        // 插入模块配置快照
        await query(
          `INSERT INTO test_session_module (test_session_id, module_index, spatial_freq, temporal_freq,
           interval_sec, duration_sec, initial_contrast, up_rule, down_rule, reversal_target, step_correct, step_wrong)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [sessionId, i + 1, m.spatial, m.temporal, m.interval, m.duration, m.initialContrast,
           m.up, m.down, m.reversal, m.stepCorrect, m.stepWrong]
        )
        
        // 插入模块结果
        if (result) {
          await query(
            `INSERT INTO test_module_result (test_session_id, module_index, threshold, spatial_freq, temporal_freq,
             reversal_count, total_trials, duration_ms) VALUES (?,?,?,?,?,?,?,?)`,
            [sessionId, i + 1, result.threshold, result.spatial, result.temporal,
             result.reversalCount, result.totalTrials, result.duration]
          )
        }
      }
    }
    
    // 插入试验详细记录
    if (trials && Array.isArray(trials)) {
      for (const trial of trials) {
        await query(
          `INSERT INTO test_trial (test_session_id, module_index, trial_index, direction, response, correct,
           contrast, spatial_freq, temporal_freq, is_reversal, response_time_ms, trial_timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [sessionId, trial.moduleIndex + 1, trial.trial, trial.direction, trial.response || null,
           trial.correct ? 1 : 0, trial.contrast, trial.spatial, trial.temporal,
           trial.reversal ? 1 : 0, trial.responseTime || null, new Date(trial.timestamp).toISOString().slice(0, 19).replace('T', ' ')]
        )
      }
    }
    
    res.json({ ok: true, data: { id: sessionId } })
  } catch (err) {
    console.error('POST /api/test-sessions error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

// 获取患者的测试结果列表
app.get('/api/test-sessions', async (req, res) => {
  try {
    const { patientId } = req.query
    let sql = 'SELECT id, patient_id, test_name, eye, mode, started_at, finished_at FROM test_session'
    let params = []
    
    if (patientId) {
      sql += ' WHERE patient_id = ?'
      params.push(patientId)
    }
    
    sql += ' ORDER BY started_at DESC'
    
    const rows = await query(sql, params)
    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('GET /api/test-sessions error:', err)
    res.status(500).json({ ok: false, message: '服务器错误', error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Hospital backend listening on http://localhost:${PORT}`)
})



-- 测试方案模板表（保存测试的基本信息和配置）
CREATE TABLE test_template (
  `id`                BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '测试方案ID',
  `name`              VARCHAR(100) NOT NULL COMMENT '测试名称',
  
  -- 基本信息（背景和光栅参数）
  `bg_rgb`            VARCHAR(20)  NOT NULL COMMENT '背景颜色 RGB，如 128,128,128',
  `bg_luminance`      DECIMAL(6,2) NOT NULL COMMENT '背景亮度',
  `grating_size_deg`  DECIMAL(6,2) NOT NULL COMMENT '光栅大小 视角',
  `orientation`       VARCHAR(20)  NOT NULL COMMENT '光栅显示方向 vertical/horizontal',
  `grating_gray`      INT          NOT NULL COMMENT '光栅颜色 灰度值 0-255',
  `avg_luminance`     DECIMAL(6,2) NOT NULL COMMENT '平均亮度',
  
  -- 显示和几何参数
  `distance_cm`       DECIMAL(6,2) NOT NULL COMMENT '测试距离 cm',
  `screen_w_cm`       DECIMAL(6,2) NOT NULL COMMENT '屏幕长度 水平边 cm',
  `screen_h_cm`       DECIMAL(6,2) NOT NULL COMMENT '屏幕宽度 垂直边 cm',
  
  -- 测试流程参数
  `module_gap_sec`    DECIMAL(6,2) NOT NULL COMMENT '模块间隔时间 秒',
  `module_order`      VARCHAR(20)  NOT NULL COMMENT '模块显示顺序: ordered/random',
  `result_reversalN`  INT          NOT NULL COMMENT '结果计算 最后多少次reversal的平均值',
  `show_params`       TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否显示光栅参数 1=yes 0=no',
  `mode`              VARCHAR(20)  NOT NULL COMMENT '测试模式: auto/manual',
  
  -- 元数据
  `is_default`        TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否为默认测试方案 1=yes 0=no',
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试方案模板 基本信息';

-- 测试方案的模块配置表
CREATE TABLE test_template_module (
  `id`                BIGINT       PRIMARY KEY AUTO_INCREMENT,
  `test_template_id`  BIGINT       NOT NULL COMMENT '所属测试方案',
  `module_index`      INT          NOT NULL COMMENT '模块序号，从1开始',
  
  -- 模块参数
  `spatial_freq`      DECIMAL(6,2) NOT NULL COMMENT '空间频率 c/d',
  `temporal_freq`     DECIMAL(6,2) NOT NULL COMMENT '时间频率 Hz',
  `interval_sec`      DECIMAL(6,2) NOT NULL COMMENT '间隔时间 秒',
  `duration_sec`      DECIMAL(6,2) NOT NULL COMMENT '持续时间 秒',
  `initial_contrast`  DECIMAL(6,2) NOT NULL COMMENT '初始对比度 百分比',
  
  -- 对比度切换逻辑
  `up_rule`           INT          NOT NULL COMMENT '连续错误多少次上升对比度',
  `down_rule`         INT          NOT NULL COMMENT '连续正确多少次下降对比度',
  `reversal_target`   INT          NOT NULL COMMENT '目标reversal次数',
  `step_correct`      DECIMAL(6,2) NOT NULL COMMENT '正确时对比度乘以的比例 百分比',
  `step_wrong`        DECIMAL(6,2) NOT NULL COMMENT '错误时对比度乘以的比例 百分比',
  
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_template_module_template
    FOREIGN KEY (`test_template_id`) REFERENCES test_template(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试方案的模块配置';

-- 测试会话表（一次实际执行的测试）
CREATE TABLE test_session (
  `id`                BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '测试会话ID',
  
  -- 关联信息
  `patient_id`        VARCHAR(64)  NOT NULL COMMENT '患者ID',
  `test_template_id`  BIGINT       NULL COMMENT '使用的测试方案ID 可为空',
  
  -- 测试基本信息（复制自test_template，用于历史记录）
  `test_name`         VARCHAR(100) NOT NULL COMMENT '测试名称',
  `eye`               CHAR(1)      NOT NULL COMMENT '测试眼别 L=左眼 R=右眼 B=双眼',
  `mode`              VARCHAR(20)  NOT NULL COMMENT '测试模式',
  
  -- 背景和光栅参数
  `bg_rgb`            VARCHAR(20)  NOT NULL,
  `bg_luminance`      DECIMAL(6,2) NOT NULL,
  `grating_size_deg`  DECIMAL(6,2) NOT NULL,
  `orientation`       VARCHAR(20)  NOT NULL,
  `grating_gray`      INT          NOT NULL,
  `avg_luminance`     DECIMAL(6,2) NOT NULL,
  
  -- 显示和几何参数
  `distance_cm`       DECIMAL(6,2) NOT NULL,
  `screen_w_cm`       DECIMAL(6,2) NOT NULL,
  `screen_h_cm`       DECIMAL(6,2) NOT NULL,
  
  -- 测试流程参数
  `module_gap_sec`    DECIMAL(6,2) NOT NULL,
  `module_order`      VARCHAR(20)  NOT NULL,
  `result_reversalN`  INT          NOT NULL,
  `show_params`       TINYINT(1)   NOT NULL DEFAULT 1,
  
  -- 运行信息
  `total_duration_ms` BIGINT       NULL COMMENT '整次测试耗时 毫秒',
  `started_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at`       DATETIME     NULL,
  
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_test_session_patient
    FOREIGN KEY (`patient_id`) REFERENCES patient(`id`),
  CONSTRAINT fk_test_session_template
    FOREIGN KEY (`test_template_id`) REFERENCES test_template(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试会话 一次实际执行的测试';

-- 测试会话的模块配置快照（保存测试时实际使用的模块配置）
CREATE TABLE test_session_module (
  `id`                BIGINT       PRIMARY KEY AUTO_INCREMENT,
  `test_session_id`   BIGINT       NOT NULL COMMENT '所属测试会话',
  `module_index`      INT          NOT NULL COMMENT '模块序号',
  
  -- 模块参数（快照）
  `spatial_freq`      DECIMAL(6,2) NOT NULL,
  `temporal_freq`     DECIMAL(6,2) NOT NULL,
  `interval_sec`      DECIMAL(6,2) NOT NULL,
  `duration_sec`      DECIMAL(6,2) NOT NULL,
  `initial_contrast`  DECIMAL(6,2) NOT NULL,
  `up_rule`           INT          NOT NULL,
  `down_rule`         INT          NOT NULL,
  `reversal_target`   INT          NOT NULL,
  `step_correct`      DECIMAL(6,2) NOT NULL,
  `step_wrong`        DECIMAL(6,2) NOT NULL,
  
  CONSTRAINT fk_session_module_session
    FOREIGN KEY (`test_session_id`) REFERENCES test_session(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试会话的模块配置快照';

-- 模块测试结果表（每个模块的汇总结果）
CREATE TABLE test_module_result (
  `id`                BIGINT       PRIMARY KEY AUTO_INCREMENT,
  `test_session_id`   BIGINT       NOT NULL COMMENT '所属测试会话',
  `module_index`      INT          NOT NULL COMMENT '模块序号',
  
  `threshold`         DECIMAL(8,4) NOT NULL COMMENT '对比度阈值 百分比',
  `spatial_freq`      DECIMAL(6,2) NOT NULL,
  `temporal_freq`     DECIMAL(6,2) NOT NULL,
  `reversal_count`    INT          NOT NULL COMMENT '实际reversal次数',
  `total_trials`      INT          NOT NULL COMMENT '总试验次数',
  `duration_ms`       BIGINT       NOT NULL COMMENT '该模块耗时 毫秒',
  
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_module_result_session
    FOREIGN KEY (`test_session_id`) REFERENCES test_session(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模块测试结果汇总';

-- 单次试验记录表（每次试验的详细数据）
CREATE TABLE test_trial (
  `id`                BIGINT       PRIMARY KEY AUTO_INCREMENT,
  `test_session_id`   BIGINT       NOT NULL COMMENT '所属测试会话',
  `module_index`      INT          NOT NULL COMMENT '所属模块序号',
  `trial_index`       INT          NOT NULL COMMENT '试验序号',
  
  -- 试验数据
  `direction`         VARCHAR(10)  NOT NULL COMMENT '显示运动方向: up/down/left/right',
  `response`         VARCHAR(10)  NULL COMMENT '被试按键方向',
  `correct`          TINYINT(1)    NOT NULL COMMENT '判断正误: 1=正确, 0=错误',
  `contrast`         DECIMAL(8,4) NOT NULL COMMENT '当前对比度 百分比',
  
  `spatial_freq`      DECIMAL(6,2) NOT NULL,
  `temporal_freq`     DECIMAL(6,2) NOT NULL,
  `is_reversal`       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否为reversal点',
  
  `response_time_ms`  INT          NULL COMMENT '反应时 毫秒',
  `trial_timestamp`   DATETIME     NOT NULL COMMENT '试验时间戳',
  
  CONSTRAINT fk_trial_session
    FOREIGN KEY (`test_session_id`) REFERENCES test_session(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单次试验详细记录';

-- 创建索引以提高查询性能
CREATE INDEX idx_test_template_default ON test_template(`is_default`);
CREATE INDEX idx_test_session_patient ON test_session(`patient_id`);
CREATE INDEX idx_test_session_template ON test_session(`test_template_id`);
CREATE INDEX idx_test_session_started ON test_session(`started_at`);
CREATE INDEX idx_test_trial_session_module ON test_trial(`test_session_id`, `module_index`);


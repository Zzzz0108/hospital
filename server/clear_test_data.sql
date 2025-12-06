-- 清空测试数据（按外键依赖顺序删除）
USE hospital;

-- 先删除最底层的试验记录
DELETE FROM test_trial;

-- 删除模块结果
DELETE FROM test_module_result;

-- 删除模块配置快照
DELETE FROM test_session_module;

-- 最后删除测试会话（父表）
DELETE FROM test_session;


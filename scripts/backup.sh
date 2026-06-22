#!/bin/bash
# 数据库自动备份脚本
# 使用 sqlite3 .backup 命令安全复制数据库

set -e

# 配置
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="$PROJECT_DIR/dev.db"
BACKUP_DIR="$PROJECT_DIR/backups"
DAYS_TO_KEEP=30

# 检查 sqlite3 是否可用
if ! command -v sqlite3 &> /dev/null; then
    echo "错误: sqlite3 未安装"
    exit 1
fi

# 检查数据库文件是否存在
if [ ! -f "$DB_FILE" ]; then
    echo "错误: 数据库文件不存在: $DB_FILE"
    exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dev-${DATE}_${TIME}.db"

# 执行备份
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

if [ $? -eq 0 ]; then
    echo "备份成功: $BACKUP_FILE"
else
    echo "备份失败"
    exit 1
fi

# 清理旧备份
find "$BACKUP_DIR" -name "dev-*.db" -mtime +$DAYS_TO_KEEP -delete 2>/dev/null
echo "已清理 ${DAYS_TO_KEEP} 天前的旧备份"

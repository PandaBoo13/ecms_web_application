# Đồng bộ OC01/database/ecms.dbml với schema public hiện tại trên Neon.
#
#   .\OC01\sync-schema.ps1            # xem trước (in ra stdout, không ghi file)
#   .\OC01\sync-schema.ps1 -Check     # exit 1 nếu ecms.dbml đang lệch Neon
#   .\OC01\sync-schema.ps1 -Write     # ghi đè ecms.dbml
#   .\OC01\sync-schema.ps1 -Full -Write   # sinh lại toàn bộ, bỏ Note thủ công
#
# Kết nối lấy từ OC01/src/main/resources/application.yaml.
# Có thể override:  $env:ECMS_DATABASE_URL = 'postgresql://user:pass@host/db?sslmode=require'
#
# Yêu cầu: Python 3 + psycopg2 (pip install psycopg2-binary)

param(
    [switch]$Write,
    [switch]$Check,
    [switch]$Full,
    [switch]$RefreshNotes
)

$script = Join-Path $PSScriptRoot 'database\sync_dbml.py'
$pyArgs = @($script)

if ($Write) { $pyArgs += '--write' }
if ($Check) { $pyArgs += '--check' }
if ($Full) { $pyArgs += '--full' }
if ($RefreshNotes) { $pyArgs += '--refresh-notes' }

python @pyArgs
exit $LASTEXITCODE


# CDP WebSocket client — inspect webview via port 9000
# Target: 5659BD66F75F598F5434DCFE39D7A138 (nodegenie.nodegenie webview)

$wsUrl = "ws://localhost:9000/devtools/page/5659BD66F75F598F5434DCFE39D7A138"
$outFile = "C:\Users\nguoi\Desktop\NodeGenie\cdp_result.txt"

$expressions = @(
    # Kiểm tra SVG tồn tại không
    "typeof document !== 'undefined' ? 'DOM_OK' : 'NO_DOM'",
    # Số lượng SVG elements
    "document.querySelectorAll('svg *').length",
    # Nội dung #svg có gì
    "document.getElementById('svg') ? document.getElementById('svg').childNodes.length + ' children' : 'NO_SVG'",
    # Kiểm tra gn có children không  
    "document.getElementById('gn') ? document.getElementById('gn').children.length + ' node-elements' : 'NO_GN'",
    # Console errors — kiểm tra body background
    "document.body ? document.body.style.background + ' / H=' + document.body.clientHeight : 'NO_BODY'",
    # Kiểm tra JS đã chạy chưa
    "typeof nodes !== 'undefined' ? 'nodes=' + nodes.length : 'JS_NOT_RUN'",
    # Kiểm tra nEls
    "typeof nEls !== 'undefined' ? 'nEls=' + nEls.length : 'nEls_UNDEFINED'"
)

Add-Type -AssemblyName System.Net.WebSockets, System.Threading

function Invoke-CDP {
    param($wsUri, $expression, $id)
    
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $cts.CancelAfter(5000)
    
    try {
        $ws.ConnectAsync([Uri]$wsUri, $cts.Token).Wait()
        
        $msg = '{"id":' + $id + ',"method":"Runtime.evaluate","params":{"expression":"' + $expression.Replace('"', '\"') + '","returnByValue":true}}'
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
        $ws.SendAsync([ArraySegment[byte]]$bytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
        
        $buf = New-Object byte[] 4096
        $result = $ws.ReceiveAsync([ArraySegment[byte]]$buf, $cts.Token).GetAwaiter().GetResult()
        $response = [System.Text.Encoding]::UTF8.GetString($buf, 0, $result.Count)
        
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, '', $cts.Token).Wait()
        return $response
    } catch {
        return "ERROR: $_"
    }
}

$results = @()
$i = 1
foreach ($expr in $expressions) {
    $r = Invoke-CDP -wsUri $wsUrl -expression $expr -id $i
    $results += "[$i] EXPR: $expr"
    $results += "RESULT: $r"
    $results += "---"
    $i++
}

$results | Out-File $outFile -Encoding UTF8
Write-Host "CDP results saved to: $outFile"

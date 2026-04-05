
# CDP WebSocket — Kiểm tra body innerHTML và xem inner frames
$wsUrl = "ws://localhost:9000/devtools/page/5659BD66F75F598F5434DCFE39D7A138"
$outFile = "C:\Users\nguoi\Desktop\NodeGenie\cdp_result2.txt"

Add-Type -AssemblyName System.Net.WebSockets

function Invoke-CDP {
    param($wsUri, $expression, $id)
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $cts.CancelAfter(5000)
    try {
        $ws.ConnectAsync([Uri]$wsUri, $cts.Token).Wait()
        $msg = '{"id":' + $id + ',"method":"Runtime.evaluate","params":{"expression":"' + ($expression -replace '"','\"') + '","returnByValue":true}}'
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
        $ws.SendAsync([ArraySegment[byte]]$bytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
        $buf = New-Object byte[] 8192
        $result = $ws.ReceiveAsync([ArraySegment[byte]]$buf, $cts.Token).GetAwaiter().GetResult()
        $response = [System.Text.Encoding]::UTF8.GetString($buf, 0, $result.Count)
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, '', $cts.Token).Wait()
        return $response
    } catch { return "ERROR: $_" }
}

$expressions = @(
    "window.frames.length + ' frames'",
    "document.body.innerHTML.substring(0, 300)",
    "document.querySelectorAll('iframe').length + ' iframes'",
    "document.querySelectorAll('iframe')[0] ? document.querySelectorAll('iframe')[0].src : 'NO_IFRAME'",
    "document.title",
    "getComputedStyle(document.body).backgroundColor",
    "document.body.children.length + ' children in body'",
    "document.body.children[0] ? document.body.children[0].tagName + ':' + document.body.children[0].id : 'NO_CHILD'"
)

$results = @(); $i = 1
foreach ($expr in $expressions) {
    $r = Invoke-CDP -wsUri $wsUrl -expression $expr -id $i
    $results += "[$i] $expr"
    $results += "=> $r"
    $results += ""
    $i++
}

$results | Out-File $outFile -Encoding UTF8
Write-Host "Done. See: $outFile"

Title: WindowsでProコントローラー等のUSB接続を抜き差しせずリセットするPowerShell手順
Date: 2026-11-28 21:10
Category: 技術メモ
Tags: Windows, PowerShell, PC, ゲーム, トラブルシューティング
Slug: windows-gamepad-usb-reset-powershell
Summary: Windows標準のGet-PnpDeviceとpnputil /restart-deviceを使い、USBハブを巻き込まずにSwitch ProコントローラーやUSBゲームパッドだけを再起動するPowerShellスクリプトと安全確認手順を解説します。
en_url: en/windows-gamepad-usb-reset-powershell.html

Windows PCにUSB接続したSwitch用Proコントローラーやゲームパッドの認識をリセットしたいとき、ケーブルを毎回抜き差ししなくても、Windows標準の `Get-PnpDevice` と `pnputil /restart-device` を組み合わせたPowerShellスクリプトで**コントローラー単体のUSBデバイスだけを再起動**できます。

ポイントは、見つかったHIDノードから親デバイス（`DEVPKEY_Device_Parent`）をたどり、**該当機器の `USB\VID_...&PID_...` ノードだけを止めて再認識させる**ことです。`USB\ROOT_HUB` や `PCI\` コントローラーまで遡らないため、同じUSBハブにつないだキーボードやマウスを巻き込まずに済みます。

## この手順でできることと前提条件

このスクリプト（PowerShell 5.1以降）は、Windowsに標準搭載されているPnP管理コマンドと `pnputil.exe` だけで動作し、追加ソフトは不要です。

- **対象**：USB有線接続のSwitch Proコントローラー、スイッチ風USBコントローラー、各種USBゲームパッド
- **実行環境**：Windows 10 / 11 の PowerShell 5.1以降
- **権限**：一覧表示（`-List`）と事前確認（`-WhatIf`）は通常権限でも可能、実際のリセット実行には**管理者として実行したターミナル**が必要

## まず確認する安全な実行ステップ

いきなり再起動を実行せず、次の順番で確認すると別デバイスを誤って再起動するのを防げます。

### 1. 接続中のコントローラー一覧を確認する（`-List`）

まずは `-List` を付けて、現在Windowsに認識されているゲームパッド候補だけを表示します。

```powershell
.\reset-gamepad.ps1 -List
```

この段階ではデバイスの再起動は一切行われません。`Status`、`Class`、`FriendlyName`、`InstanceId` が一覧で出るので、対象の `FriendlyName` や `InstanceId` を確認します。

### 2. `-WhatIf` で再起動対象をドライラン確認する

PowerShellの `SupportsShouldProcess` に対応しているため、`-WhatIf` を付けると「どの `InstanceId` を再起動しようとしているか」だけを確認できます。

```powershell
.\reset-gamepad.ps1 -WhatIf
```

複数台のコントローラーがつながっている場合は、安全のためスクリプトが自動で停止します。その場合は `-List` で確認した正確な `InstanceId` を指定して確認します。

```powershell
.\reset-gamepad.ps1 -InstanceId "HID\VID_1234&PID_5678\..." -WhatIf
```

### 3. 管理者ターミナルで再起動を実行する

対象が1台に絞れて、`Restart target` が `USB\VID_...&PID_...` になっていることを確認できたら、管理者として開いたターミナルで `-WhatIf` を外して実行します。

```powershell
.\reset-gamepad.ps1
```

名前で絞り込む場合は `-Name`、複数接続時に1台だけ指定する場合は `-InstanceId` を使います。

```powershell
.\reset-gamepad.ps1 -Name "USB Gamepad"
.\reset-gamepad.ps1 -InstanceId "HID\VID_1234&PID_5678\..."
```

実行に成功すると、`pnputil /restart-device` のあとに700ms待機して `pnputil /scan-devices` が走り、デバイスの再列挙まで完了します。

## スクリプトに組み込んでいる安全ガード

USB関連のコマンドを誤って親ノードへ適用すると、同じハブ上の入力機器まで一時切断される恐れがあります。それを避けるため、このスクリプトでは次の制限をコード側で入れています。

1. **複数一致時は必ず停止する**：一致件数が0件または2件以上のときは例外を出して止まり、`-InstanceId` での単一指定を求めます。
2. **USBルートハブやPCIには遡らない**：`DEVPKEY_Device_Parent` を最大10階層までたどる間、`USB\VID_xxxx&PID_xxxx` に到達した時点で探索を打ち切り、`USB\ROOT_HUB` や `PCI\` を見つけた場合は停止します。
3. **Switch Pro系USB HIDの補助判定**：一部のSwitch互換コントローラーはWindows上でHID側の `FriendlyName` が汎用名になるため、既定の `-Name 'Pro Controller'` 検索時のみ `HID\VID_057E&PID_2009\` も候補として拾います。
4. **再起動要求（終了コード3010）を明示する**：`pnputil` が終了コード `3010` を返した場合は、即時再起動できずOS再起動が必要であることを警告表示します。

## スクリプト全文（`reset-gamepad.ps1`）

以下を `reset-gamepad.ps1` として保存して使えます。コマンド仕様の詳細は [Microsoft公式のGet-PnpDeviceリファレンス](https://learn.microsoft.com/en-us/powershell/module/pnpdevice/get-pnpdevice) および [Microsoft公式のPnPUtilコマンド構文](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/pnputil-command-syntax) を参照してください。

```powershell
#requires -Version 5.1

<#
.SYNOPSIS
Restarts only the PnP device that owns a connected gamepad.

.DESCRIPTION
By default, finds one present device whose friendly name contains
"Pro Controller", walks up the PnP tree to the nearest USB device, and
restarts that device with the Windows built-in PnPUtil command.

The script deliberately refuses to continue when multiple devices match.
It never restarts a USB hub, host controller, or PCI device.
#>

[CmdletBinding(DefaultParameterSetName = 'ByName', SupportsShouldProcess)]
param(
    [Parameter(ParameterSetName = 'ByName')]
    [ValidateNotNullOrEmpty()]
    [string] $Name = 'Pro Controller',

    [Parameter(Mandatory, ParameterSetName = 'ByInstanceId')]
    [ValidateNotNullOrEmpty()]
    [string] $InstanceId,

    [switch] $List,

    # Restart the matched PnP node itself instead of its nearest USB parent.
    # This is useful for diagnostics, but usually performs a shallower reset.
    [switch] $LeafOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PresentDevices {
    return @(Get-PnpDevice -PresentOnly)
}

function Show-LikelyGamepads {
    param([object[]] $Devices)

    $likely = @($Devices | Where-Object {
        $_.Class -in @('HIDClass', 'XboxComposite', 'XnaComposite', 'Bluetooth') -and
        $_.FriendlyName -and
        $_.FriendlyName -match '(?i)controller|gamepad|joystick|xbox'
    })

    if ($likely.Count -eq 0) {
        Write-Host 'No likely gamepad devices are currently present.'
        return
    }

    $likely |
        Sort-Object Class, FriendlyName |
        Format-Table Status, Class, FriendlyName, InstanceId -AutoSize -Wrap
}

function Get-ParentInstanceId {
    param([Parameter(Mandatory)][string] $ChildInstanceId)

    try {
        $property = Get-PnpDeviceProperty `
            -InstanceId $ChildInstanceId `
            -KeyName 'DEVPKEY_Device_Parent' `
            -WhatIf:$false `
            -ErrorAction Stop

        if ($null -eq $property.Data) {
            return $null
        }

        return [string] $property.Data
    }
    catch {
        return $null
    }
}

function Find-NearestUsbDevice {
    param([Parameter(Mandatory)][string] $StartingInstanceId)

    $currentId = $StartingInstanceId
    $visited = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )

    for ($depth = 0; $depth -lt 10; $depth++) {
        if (-not $visited.Add($currentId)) {
            break
        }

        if ($currentId -match '^USB\\VID_[0-9A-F]{4}&PID_[0-9A-F]{4}') {
            return $currentId
        }

        if ($currentId -match '^(USB\\ROOT_HUB|PCI\\)') {
            break
        }

        $parentId = Get-ParentInstanceId -ChildInstanceId $currentId
        if ([string]::IsNullOrWhiteSpace($parentId)) {
            break
        }

        $currentId = $parentId
    }

    return $null
}

$presentDevices = Get-PresentDevices

if ($List) {
    Show-LikelyGamepads -Devices $presentDevices
    return
}

if ($PSCmdlet.ParameterSetName -eq 'ByInstanceId') {
    $deviceMatches = @($presentDevices | Where-Object {
        $_.InstanceId -eq $InstanceId
    })
}
else {
    $deviceMatches = @($presentDevices | Where-Object {
        $friendlyNameMatches = $_.FriendlyName -and
            ([string] $_.FriendlyName).IndexOf($Name, [StringComparison]::OrdinalIgnoreCase) -ge 0

        $isNintendoProUsbHid = $Name -eq 'Pro Controller' -and
            $_.Class -eq 'HIDClass' -and
            $_.InstanceId -match '^HID\\VID_057E&PID_2009\\'

        $friendlyNameMatches -or $isNintendoProUsbHid
    })
}

if ($deviceMatches.Count -eq 0) {
    Write-Host 'No matching device was found. Present candidates:' -ForegroundColor Yellow
    Show-LikelyGamepads -Devices $presentDevices
    throw 'Specify another -Name, or use -List and pass an exact -InstanceId.'
}

if ($deviceMatches.Count -gt 1) {
    Write-Host 'Multiple devices matched. Stopping for safety:' -ForegroundColor Yellow
    $deviceMatches |
        Format-Table Status, Class, FriendlyName, InstanceId -AutoSize -Wrap
    throw 'Use -InstanceId to select exactly one device.'
}

$selected = $deviceMatches[0]
$restartInstanceId = [string] $selected.InstanceId

if (-not $LeafOnly) {
    $usbInstanceId = Find-NearestUsbDevice -StartingInstanceId $restartInstanceId
    if ([string]::IsNullOrWhiteSpace($usbInstanceId)) {
        throw 'No safe USB parent was found. The device may be Bluetooth or virtual. Use -LeafOnly only if you intend to restart the matched leaf node.'
    }

    $restartInstanceId = $usbInstanceId
}

Write-Host ('Detected: {0}' -f $selected.FriendlyName)
Write-Host ('PnP ID: {0}' -f $selected.InstanceId)
Write-Host ('Restart target: {0}' -f $restartInstanceId)

if (-not (Test-IsAdministrator)) {
    throw 'Administrator rights are required. Open Terminal as Administrator and run this script again.'
}

$pnpUtilPath = Join-Path $env:SystemRoot 'System32\pnputil.exe'
if (-not (Test-Path -LiteralPath $pnpUtilPath)) {
    throw "PnPUtil was not found: $pnpUtilPath"
}

if ($PSCmdlet.ShouldProcess($restartInstanceId, 'Restart PnP device')) {
    & $pnpUtilPath /restart-device $restartInstanceId
    if ($LASTEXITCODE -eq 3010) {
        Write-Warning 'Windows accepted the request but requires a system reboot. The device cannot be restarted live with this method.'
        return
    }

    if ($LASTEXITCODE -ne 0) {
        throw "PnPUtil failed to restart the device. Exit code: $LASTEXITCODE"
    }

    Start-Sleep -Milliseconds 700
    & $pnpUtilPath /scan-devices
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Device rescan failed. Exit code: $LASTEXITCODE"
    }

    Write-Host 'Gamepad restart and re-enumeration completed.' -ForegroundColor Green
}
```

## 注意点と使い分け

- **Bluetooth接続や仮想ゲームパッドにはUSB親がない**：無線や仮想ドライバ経由のコントローラーは `USB\VID_...&PID_...` の親を持たないため、既定ではエラーで止まります。リーフノード自体を診断目的で再起動したい場合のみ `-LeafOnly` を使います。
- **物理ケーブルの接触不良はソフトで直らない**：デバイスの再認識で回復しない場合は、ケーブルやポート側のトラブル切り分けも必要です。予備や古い周辺機器用のケーブル確認については[セリアの110円MicroUSBケーブル記事](/seria-micro-usb-cable.html)、Windows環境全体のメンテナンス記録は[CHUWI CoreBook XのWindows 11再インストール手順](/chuwi-corebook-x-os-reinstall.html)もあわせてご覧ください。
- **公開共有時の注意**：`-List` の出力にはBluetoothアドレスや接続先デバイス固有の `InstanceId` が含まれるため、スクリーンショットやログをそのまま公開しないよう気をつけてください。

## まとめ

WindowsでUSBゲームパッドやSwitch Proコントローラーを抜き差しせずにリセットしたいときは、`Get-PnpDevice` で対象を1台に絞り、`DEVPKEY_Device_Parent` から直近の `USB\VID_...&PID_...` だけを見つけて `pnputil /restart-device` を実行するのが安全です。まず `-List` と `-WhatIf` で対象を確かめてから使ってみてください。

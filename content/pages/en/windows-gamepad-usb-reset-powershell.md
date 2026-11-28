Title: Reset a USB Gamepad or Switch Pro Controller on Windows with PowerShell (Without Unplugging)
Date: 2026-11-28 21:10
Category: Tech notes
Tags: Windows, PowerShell, PC, Games, Troubleshooting
Slug: windows-gamepad-usb-reset-powershell-en
Summary: Restart only a USB-connected Switch Pro Controller or gamepad on Windows using built-in Get-PnpDevice and pnputil /restart-device without resetting USB hubs or unplugging the cable.
Lang: en
URL: en/windows-gamepad-usb-reset-powershell.html
Save_as: en/windows-gamepad-usb-reset-powershell.html
ja_url: windows-gamepad-usb-reset-powershell.html
en_article: true

If a USB-connected Switch Pro Controller or PC gamepad needs to be re-initialized on Windows, you do not always have to physically unplug and replug the cable. Built-in Windows PowerShell (`Get-PnpDevice` and `Get-PnpDeviceProperty`) combined with `pnputil /restart-device` can restart **only the controller's own USB device node**.

The key safety detail is walking up the PnP tree via `DEVPKEY_Device_Parent` until reaching the nearest `USB\VID_...&PID_...` device, while explicitly stopping before `USB\ROOT_HUB` or `PCI\` nodes so your keyboard, mouse, and other hub devices stay connected.

## Requirements and Scope

- **Target devices**: USB-wired Switch Pro Controllers, Switch-compatible USB controllers, and standard USB gamepads
- **Environment**: Windows 10 or Windows 11 with PowerShell 5.1 or later (no third-party tools required)
- **Permissions**: Listing devices (`-List`) and dry runs (`-WhatIf`) work as a normal user; restarting the device requires an **Administrator** terminal

## Safe 3-Step Workflow

### 1. List present gamepad candidates (`-List`)

First, inspect the gamepads currently visible to Windows without making any changes:

```powershell
.\reset-gamepad.ps1 -List
```

This prints `Status`, `Class`, `FriendlyName`, and `InstanceId` for present devices under `HIDClass`, `XboxComposite`, `XnaComposite`, or `Bluetooth` whose friendly name matches common controller terms.

### 2. Dry-run the target selection (`-WhatIf`)

Because the script uses `[CmdletBinding(SupportsShouldProcess)]`, you can preview the exact restart target before running `pnputil`:

```powershell
.\reset-gamepad.ps1 -WhatIf
```

If multiple controllers match, the script stops intentionally and asks you to pass a single `-InstanceId`:

```powershell
.\reset-gamepad.ps1 -InstanceId "HID\VID_1234&PID_5678\..." -WhatIf
```

### 3. Run the reset in an elevated terminal

Once `Restart target` shows the expected `USB\VID_...&PID_...` ID, open Terminal as Administrator and run without `-WhatIf`:

```powershell
.\reset-gamepad.ps1
```

You can also target another controller name with `-Name "USB Gamepad"` or pass `-InstanceId`. After `pnputil /restart-device` succeeds, the script waits 700 ms and calls `pnputil /scan-devices` to re-enumerate the device.

## Safety Guardrails Built Into the Script

1. **Refuses ambiguous matches**: Zero matches or multiple matches abort execution instead of guessing.
2. **Never touches hubs or host controllers**: `Find-NearestUsbDevice` climbs at most 10 levels, returns as soon as it sees `^USB\\VID_[0-9A-F]{4}&PID_[0-9A-F]{4}`, and breaks immediately on `USB\ROOT_HUB` or `PCI\`.
3. **USB Switch Pro HID fallback**: Some Switch-compatible controllers expose a generic HID friendly name; when searching with the default `-Name 'Pro Controller'`, the script also checks `HID\VID_057E&PID_2009\`.
4. **Handles exit code `3010`**: If Windows requires a full system reboot instead of a live restart, `pnputil` exit code `3010` surfaces as a clear warning.

## Complete PowerShell Script (`reset-gamepad.ps1`)

For command details, see Microsoft's [`Get-PnpDevice` reference](https://learn.microsoft.com/en-us/powershell/module/pnpdevice/get-pnpdevice) and [PnPUtil command syntax](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/pnputil-command-syntax).

```powershell
#requires -Version 5.1

[CmdletBinding(DefaultParameterSetName = 'ByName', SupportsShouldProcess)]
param(
    [Parameter(ParameterSetName = 'ByName')]
    [ValidateNotNullOrEmpty()]
    [string] $Name = 'Pro Controller',

    [Parameter(Mandatory, ParameterSetName = 'ByInstanceId')]
    [ValidateNotNullOrEmpty()]
    [string] $InstanceId,

    [switch] $List,
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

## Caveats

- **Bluetooth and virtual controllers**: Without a USB parent node, the default mode stops safely. Only pass `-LeafOnly` when you deliberately want to restart the matched leaf node for diagnostics.
- **Keep device IDs private**: When sharing troubleshooting logs, avoid posting raw Bluetooth device addresses or hardware-specific `InstanceId` strings from `-List`.
- **Hardware cables still matter**: If a controller keeps dropping even after a clean PnP reset, check the USB cable and port as well (see also [buying a 110-yen MicroUSB cable at Seria](/en/seria-micro-usb-cable.html)).

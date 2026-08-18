# Sargodha Vaccination Automation
## Appium 2 + UiAutomator2 + Node.js/TypeScript + Android + Excel Dashboard

This project automates the official Android vaccination application's user-by-user workflow from an Excel file.

The intended workflow is:

```text
Non-technical user
       |
       v
Double-click START.bat
       |
       +--> Node.js backend starts
       |
       +--> Appium server starts automatically
       |
       +--> Browser dashboard opens
       |
       v
Dashboard
  |       |       |       |
  |       |       |       +--> Stop
  |       |       +----------> Reset
  |       +------------------> Check-Out
  +--------------------------> Check-In
       |
       v
Node.js automation runner
       |
       v
Appium 2 / UiAutomator2
       |
       v
Android phone connected by USB/ADB
       |
       v
Vaccination Android App
```

> Important: a browser cannot start a backend server that is not already running. Therefore the recommended non-technical-user design is a single `START.bat` launcher. It starts the backend and Appium automatically, then opens the dashboard. After that, the operator only uses the browser.

---

# 1. What the operator needs to do

After the machine has been configured once:

1. Connect the Android phone with a USB data cable.
2. Unlock the phone.
3. Accept USB debugging if Android asks.
4. Double-click `START.bat`.
5. Wait for the dashboard to open.
6. Confirm the device shows `Connected`.
7. Select the required operation:
   - Start Check-In
   - Start Check-Out
   - Reset Status
   - Stop
8. Monitor the users/results table.
9. Do not close the terminal windows while automation is running.

The operator should NOT need to:
- run `appium` manually
- run `nodemon server.js` manually
- use Appium Inspector
- edit TypeScript files
- edit UDID in source code
- edit locators
- run multiple commands every day

---

# 2. First-time setup on a new laptop

## 2.1 Install Git

Install Git for Windows:

https://git-scm.com/download/win

Verify:

```powershell
git --version
```

---

## 2.2 Install Node.js

Install the current Node.js LTS release:

https://nodejs.org/

Verify:

```powershell
node --version
npm --version
```

Recommended: Node.js 20 LTS or newer LTS supported by the project.

---

## 2.3 Install Java JDK

Install a supported JDK, preferably JDK 17:

https://adoptium.net/

Verify:

```powershell
java --version
```

You should see Java 17 or another supported version.

---

# 3. Install Android ADB

ADB is part of Android SDK Platform-Tools.

Official download:

https://developer.android.com/tools/releases/platform-tools

Download:

```text
SDK Platform-Tools for Windows
```

Extract it, for example:

```text
C:\platform-tools
```

Verify without changing PATH:

```powershell
cd C:\platform-tools
.\adb.exe version
```

If that works, ADB is installed.

## Recommended: add ADB to Windows PATH

Add:

```text
C:\platform-tools
```

to the Windows Environment Variables `Path`.

Then open a NEW PowerShell/CMD window and run:

```powershell
adb version
```

If Windows says `adb is not recognized`, PATH has not been configured correctly.

---

# 4. Install Appium 2

Install globally:

```powershell
npm install -g appium@latest
```

Verify:

```powershell
appium --version
```

The project requires Appium 2.

---

# 5. Install UiAutomator2

Install the Android driver:

```powershell
appium driver install uiautomator2
```

Verify:

```powershell
appium driver list
```

`uiautomator2` must appear as installed.

Important:

UiAutomator2 is installed on the LAPTOP as an Appium driver. It is not a normal app that the operator manually installs from the Play Store.

---

# 6. Install Appium Inspector

Appium Inspector is a development/testing tool used to inspect Android UI elements and verify locators.

Download:

https://github.com/appium/appium-inspector/releases

Install the Windows version.

IMPORTANT:

Appium Inspector is NOT required for the normal daily workflow.

Use it only when:
- configuring a new app version
- changing locators
- adding a new device
- debugging an element

---

# 7. Clone the project

Open PowerShell:

```powershell
git clone YOUR_GITHUB_REPOSITORY_URL
cd sargodha-appium
```

Then:

```powershell
npm install
```

Do NOT run `npm install` globally for every project dependency. The project's `package.json` controls the local dependencies.

---

# 8. Connect a new Android phone

## 8.1 Enable Developer Options

On the Android phone:

```text
Settings
  -> About Phone
  -> Build Number
  -> Tap Build Number 7 times
```

The exact menu can differ by manufacturer.

Then:

```text
Settings
  -> Developer Options
  -> USB Debugging
  -> ON
```

---

## 8.2 Connect by USB

Use a USB cable that supports DATA, not charging-only.

Connect:

```text
Android Phone <---- USB DATA CABLE ----> Windows Laptop
```

Unlock the phone.

If Android shows:

```text
Allow USB debugging?
```

select:

```text
Allow
```

Optionally select:

```text
Always allow from this computer
```

Only do this on a trusted computer.

---

# 9. Find the phone UDID / serial

Run:

```powershell
adb devices
```

Example:

```text
List of devices attached
R8VY2010Y8A    device
```

The device serial is:

```text
R8VY2010Y8A
```

That is the value used as:

```text
UDID
```

The project must NOT require the operator to edit `appConfig.ts` every time the phone changes.

Recommended configuration:

```text
config/
  device.json
```

Example:

```json
{
  "name": "Field Phone 01",
  "udid": "R8VY2010Y8A",
  "androidVersion": "16"
}
```

The dashboard should save this through the backend.

---

# 10. Verify which physical phone is connected

If multiple phones are connected:

```powershell
adb devices
```

Then:

```powershell
adb -s R8VY2010Y8A shell getprop ro.product.model
```

Example:

```text
SM-A556E
```

Also:

```powershell
adb -s R8VY2010Y8A shell getprop ro.build.version.release
```

Example:

```text
16
```

This prevents accidentally selecting the wrong phone.

---

# 11. Find the vaccination app package and activity

Do NOT copy example package names from documentation.

Open the actual vaccination application on the phone.

Stay on its login screen.

Then run:

```powershell
adb shell dumpsys window | findstr "mCurrentFocus"
```

Example:

```text
mCurrentFocus=Window{... u0 com.example.app/com.example.app.activities.LoginActivity}
```

From this:

```text
Package:
com.example.app

Activity:
com.example.app.activities.LoginActivity
```

Use the ACTUAL values returned by your phone.

---

# 12. Current project Appium configuration

The current configuration supplied to this project contains:

```text
UDID:
R8VY2010Y8A

Android:
16

Package:
com.hisdu.emr.application

Activity:
com.hisdu.emr.application.activities.LoginActivity
```

These are machine/device-specific configuration values and should be moved out of the TypeScript source into runtime device configuration.

Do not hardcode the UDID in the source for every new laptop.

---

# 13. Recommended device configuration

Use:

```text
config/
  device.json
```

Example:

```json
{
  "name": "Sargodha Field Phone",
  "udid": "R8VY2010Y8A",
  "androidVersion": "16",
  "appPackage": "com.hisdu.emr.application",
  "appActivity": "com.hisdu.emr.application.activities.LoginActivity"
}
```

The dashboard Device Manager should be able to:

```text
1. Detect connected ADB devices
2. Show model
3. Show Android version
4. Show UDID
5. Let operator select a device
6. Save selected device
7. Test connection
```

The operator should not manually edit `appConfig.ts`.

---

# 14. Appium server

Manual development command:

```powershell
appium --port 4723 --use-drivers uiautomator2
```

For the final application, the backend should start Appium automatically.

The operator should NOT need to run this command daily.

The backend should:

```text
START
  |
  +--> check ADB
  |
  +--> check selected Android device
  |
  +--> start Appium if not already running
  |
  +--> verify Appium health
  |
  +--> enable dashboard actions
```

---

# 15. One-click START.bat

Create:

```text
START.bat
```

Recommended behavior:

```text
Double-click START.bat
        |
        +--> check Node.js
        +--> check Java
        +--> check ADB
        +--> check Android device
        +--> start Node backend
        +--> backend starts Appium
        +--> open http://localhost:3000
```

The exact implementation should be kept in the repository.

Example launcher concept:

```bat
@echo off
title Sargodha Vaccination Automation

echo ==========================================
echo SARGODHA VACCINATION AUTOMATION
echo ==========================================

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed.
    pause
    exit /b 1
)

where adb >nul 2>&1
if errorlevel 1 (
    echo ADB is not installed or not in PATH.
    pause
    exit /b 1
)

echo Checking Android device...
adb devices

echo Starting application...
npm start
```

The final project may improve this launcher further by opening the browser automatically and displaying friendly setup errors.

---

# 16. Daily operator workflow

After first-time setup:

```text
1. Connect phone
2. Unlock phone
3. Double-click START.bat
4. Dashboard opens
5. Confirm Device = Connected
6. Confirm Appium = Ready
7. Confirm Excel = Loaded
8. Click Start Check-In
```

No terminal commands should be necessary.

---

# 17. Dashboard architecture

The browser dashboard is only the USER INTERFACE.

It does not directly control Android.

Correct architecture:

```text
Browser
   |
   | HTTP API
   v
Node.js Backend
   |
   +---- Process Manager
   |
   +---- Automation Runner
   |
   +---- Excel Manager
   |
   +---- Report Manager
   |
   +---- Appium Manager
                |
                v
           Appium Server
                |
                v
          UiAutomator2
                |
                v
              ADB
                |
                v
          Android Phone
```

---

# 18. Dashboard button behavior

## Start Check-In

```text
POST /api/check-in
```

Backend:

```text
1. Confirm no job is running
2. Confirm Android device is connected
3. Confirm Appium is available
4. Load Excel
5. Start user loop
6. Login user
7. Check-In
8. Verify Check-In
9. Logout
10. Save SUCCESS
11. Continue next user
```

If authentication fails:

```text
FAILED_LOGIN
```

If another automation step fails:

```text
FAILED_STEP
```

The loop must continue.

---

# 19. Start Check-Out

Check-Out must be implemented as a separate automation flow.

DO NOT reuse the Check-In locator blindly.

Before enabling this feature:

```text
1. Open the actual app
2. Reach the actual attendance screen
3. Inspect the actual Check-Out control
4. Verify its text/resource-id/content-desc
5. Manually perform one test
6. Verify the resulting state
7. Add the verified locator
8. Test with ONE authorized test account
9. Only then enable batch processing
```

This is especially important because selecting the wrong action can produce an incorrect attendance event.

---

# 20. Reset button

Reset should NOT simply reset the browser UI.

It should call the backend:

```text
POST /api/reset
```

Recommended behavior:

```text
1. Stop active automation if necessary
2. Clear current in-memory job state
3. Reload report/status state
4. Optionally reset app state safely
5. Return dashboard to ready state
```

Do not delete historical reports unless there is a separate explicit "Delete Reports" operation.

---

# 21. Stop button

```text
POST /api/stop
```

The backend should:

```text
1. Signal automation runner to stop
2. Stop after the current safe operation
3. Prevent the next Excel row from starting
4. Cleanly close/reset the Appium session
5. Return dashboard to IDLE
```

Do not simply kill the browser UI state.

The current HTML sets its own `isRunning` state to false immediately after requesting `/api/stop`. The backend must be the source of truth for the actual process state.

---

# 22. Appium should be managed by the backend

The final architecture should NOT require:

```text
Terminal 1:
appium

Terminal 2:
nodemon server.js

Terminal 3:
automation
```

Instead:

```text
START.bat
    |
    v
Node.js backend
    |
    v
Appium Manager
    |
    v
Appium process
```

The backend should expose:

```text
GET /api/system/status
```

Example response:

```json
{
  "backend": "ready",
  "appium": "ready",
  "device": "connected",
  "deviceUdid": "R8VY2010Y8A",
  "androidVersion": "16",
  "automation": "idle"
}
```

The dashboard should display this information.

---

# 23. Excel security

The Excel file contains usernames and passwords.

DO NOT publish credentials to a public GitHub repository.

Add to `.gitignore`:

```gitignore
data/users.xlsx
config/device.json
.env
logs/
screenshots/
reports/
```

Keep the real Excel file on the local machine.

For a new laptop:

```text
1. Clone GitHub project
2. Create data/ folder
3. Copy authorized users.xlsx into data/
4. Connect authorized Android phone
5. Configure device
6. Start application
```

---

# 24. Current HTML dashboard limitations

The dashboard currently calls:

```text
/api/check-in
/api/check-out
/api/reset
/api/stop
/api/stats
/api/logs
/report.json
```

Therefore the backend MUST actually implement these endpoints.

The browser alone cannot make these endpoints exist.

The current Device Manager also stores devices only in browser memory. A page refresh loses them. The final implementation should save devices through the backend.

The current dashboard also uses a field called `fromNumber`. This should be renamed to something appropriate for this automation, such as:

```text
Start From Sr. No.
```

Example:

```text
Start From:
25
```

not a phone number.

---

# 25. Locator rules

Prefer:

```text
1. accessibility id / content-desc
2. resource-id
3. Android UIAutomator
4. XPath only when necessary
```

Avoid long XPath expressions whenever possible.

Every important action must have a verified locator:

```text
Login
Check-In
Check-In success indicator
Check-Out
Check-Out success indicator
Logout
Authentication error
```

---

# 26. Appium Inspector workflow

Only for development/configuration.

Start Appium:

```powershell
appium --port 4723
```

Connect the Android phone:

```powershell
adb devices
```

Open Appium Inspector.

Use capabilities similar to:

```json
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:udid": "YOUR_REAL_UDID",
  "appium:appPackage": "YOUR_REAL_PACKAGE",
  "appium:appActivity": "YOUR_REAL_ACTIVITY",
  "appium:noReset": true
}
```

Start the session.

Inspect:

```text
Username
Password
Login
Dashboard
Check-In
Check-In success
Check-Out
Check-Out success
Logout
Authentication error
```

Never select Check-In or Check-Out based only on a similar-looking button.

Verify the action on the actual screen.

---

# 27. Continue-on-failure rule

For every Excel row:

```text
START
  |
  v
Login
  |
  +--> Auth failure
  |       |
  |       +--> screenshot
  |       +--> FAILED_LOGIN
  |       +--> continue next row
  |
  +--> Login success
          |
          v
       Check-In
          |
          +--> Failure
          |      |
          |      +--> screenshot
          |      +--> FAILED_STEP
          |      +--> clean state
          |      +--> continue
          |
          v
       Verify
          |
          v
       Logout
          |
          v
       SUCCESS
          |
          v
     Next Excel row
```

One failed user must NEVER terminate the whole batch.

---

# 28. Reports

The system should maintain:

```text
reports/report.json
reports/report.csv
data/users.xlsx
logs/
screenshots/
```

Recommended result fields:

```text
SrNo
District
Tehsil
UnionCouncil
VaccinatorName
Username
Status
Step
ErrorMessage
Timestamp
Screenshot
```

---

# 29. New laptop checklist

```text
- [ ] Install Git
- [ ] Install Node.js LTS
- [ ] Install Java JDK
- [ ] Download Android Platform-Tools
- [ ] Add C:\platform-tools to PATH
- [ ] Verify adb
- [ ] Install Appium
- [ ] Install UiAutomator2
- [ ] Clone GitHub repository
- [ ] Run npm install
- [ ] Copy authorized users.xlsx into data/
- [ ] Enable Android Developer Options
- [ ] Enable USB Debugging
- [ ] Connect Android phone by USB
- [ ] Run adb devices
- [ ] Confirm device is "device", not "unauthorized"
- [ ] Verify phone model
- [ ] Verify Android version
- [ ] Configure/select device
- [ ] Verify app package/activity
- [ ] Test Appium session if this is a new device
- [ ] Double-click START.bat
- [ ] Open dashboard
- [ ] Confirm backend ready
- [ ] Confirm Appium ready
- [ ] Confirm device connected
- [ ] Confirm Excel loaded
- [ ] Run a ONE-user test
- [ ] Only then run the full batch
```

---

# 30. Troubleshooting

## ADB not found

```powershell
adb version
```

If not found, install Platform-Tools and add:

```text
C:\platform-tools
```

to PATH.

---

## Device unauthorized

```powershell
adb devices
```

If:

```text
unauthorized
```

unlock the phone and accept USB debugging.

---

## Device offline

Try:

```powershell
adb kill-server
adb start-server
adb devices
```

Then reconnect the USB cable.

---

## Appium driver missing

```powershell
appium driver list
```

Install:

```powershell
appium driver install uiautomator2
```

---

## Appium connection refused

Check:

```powershell
curl http://127.0.0.1:4723/status
```

If Appium is not running, the backend Appium Manager should start it automatically in the final architecture.

---

## Element not found

Use Appium Inspector and verify:

```text
resource-id
content-desc
text
className
```

Do not guess locators.

---

# 31. Recommended final user experience

The final non-technical workflow should be:

```text
CONNECT PHONE
      |
      v
DOUBLE-CLICK START.bat
      |
      v
Dashboard opens automatically
      |
      v
System Status:
Backend     READY
Appium      READY
Device      CONNECTED
Excel       LOADED
      |
      v
Select operation
      |
      +----> CHECK-IN
      |
      +----> CHECK-OUT
      |
      +----> RESET
      |
      +----> STOP
      |
      v
Watch live progress
      |
      v
Download/view results
```

The operator should not need technical knowledge after first-time installation.

---

# 32. Development rule

Do not make the dashboard responsible for starting a server that does not exist.

Use:

```text
START.bat
   |
   v
Backend
   |
   +--> Appium
   +--> Automation
   +--> Reports
   +--> Logs
   |
   v
Dashboard
```

The dashboard is the control panel, not the process manager.

---

# 33. Before production

Run this sequence:

```text
1 authorized test account
        ↓
Login test
        ↓
Check-In test
        ↓
Verify attendance state
        ↓
Logout test
        ↓
Check-Out test separately
        ↓
Verify attendance state
        ↓
2-3 test accounts
        ↓
Failure/retry test
        ↓
Stop test
        ↓
Reset test
        ↓
Full batch
```

Never start a 79-user batch until the single-user flow has been verified on the actual Android device.


# 🤖 Sargodha Vaccination Check-In Automation
**Data-driven Android automation — Appium 2 + TypeScript**

---

## 📁 Project Structure

```
sargodha-appium/
│
├── data/
│   └── users.xlsx              ← INPUT + OUTPUT Excel (79 users)
│
├── src/
│   ├── config/
│   │   └── appConfig.ts        ← ⚠️ LOCATORS + CAPABILITIES yahan replace karo
│   │
│   ├── helpers/
│   │   ├── logger.ts           ← Winston logger
│   │   ├── waitHelper.ts       ← Explicit waits, retry logic
│   │   ├── loginHelper.ts      ← Login / CheckIn / Logout actions
│   │   ├── screenshotHelper.ts ← Failure screenshots
│   │   ├── excelHelper.ts      ← Excel read/write
│   │   └── reportWriter.ts     ← JSON + CSV report
│   │
│   ├── types.ts                ← TypeScript interfaces
│   └── main.ts                 ← 🚀 MAIN ENTRY POINT
│
├── screenshots/                ← Auto-created — failure screenshots
├── logs/                       ← Auto-created — automation.log, errors.log
├── reports/                    ← Auto-created — report.json, report.csv
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚡ Installation

```bash
# 1. Node.js install karo (v18+)
node --version   # v18+ hona chahiye

# 2. Project mein jao
cd sargodha-appium

# 3. Dependencies install karo
npm install

# 4. Appium 2 globally install karo
npm install -g appium@latest

# 5. UiAutomator2 driver install karo
appium driver install uiautomator2

# 6. Verify karo
appium driver list
```

---

## 📱 Device Setup

```bash
# USB debugging enable karo (Developer Options mein)
# Phone connect karo USB se

# Device verify karo
adb devices
# Output: LIST OF DEVICES ATTACHED
# emulator-5554   device    ← ya real device serial

# App ka package aur activity nikalo
# App open karo phir yeh command chalao:
adb shell "dumpsys window | grep -E 'mCurrentFocus'"
# Output: mCurrentFocus=Window{... com.your.app/.LoginActivity}
#                                 ^^^^^^^^^^^^ ^^^^^^^^^^^^^^
#                                 appPackage   appActivity
```

---

## ⚠️ LOCATORS KAHAN REPLACE KAREIN

### Step 1: `src/config/appConfig.ts` kholo

### Step 2: CAPABILITIES update karo
```typescript
'appium:deviceName': 'SM-A505F',           // adb devices se
'appium:udid': 'R28M4010ABC',              // device serial number
'appium:platformVersion': '11',            // phone ka Android version
'appium:appPackage': 'com.vaccination.app',// adb se nikala hua
'appium:appActivity': '.LoginActivity',    // adb se nikala hua
```

### Step 3: Appium Inspector se locators nikalo
```
1. npm install -g appium-inspector   (ya standalone download karo)
2. Appium Inspector open karo
3. Same capabilities enter karo
4. "Start Session" click karo
5. App screen pe kisi element pe click karo
6. Right panel mein:
   - resource-id  →  resourceId() mein use karo
   - content-desc →  accessibilityId mein use karo
```

### Step 4: LOCATORS replace karo
```typescript
// username input resource-id:
// Example: 'com.vaccination.app:id/username'
usernameInput: 'com.vaccination.app:id/username',

// password input:
passwordInput: 'com.vaccination.app:id/password',

// login button:
loginButton: 'com.vaccination.app:id/btn_login',

// error message (wrong password ke baad):
errorMessage: 'com.vaccination.app:id/error_text',

// dashboard element (successful login ke baad dikhta ho):
welcomeText: 'com.vaccination.app:id/welcome_msg',

// check-in button:
checkInButton: 'com.vaccination.app:id/btn_checkin',

// logout button:
logoutButton: 'com.vaccination.app:id/btn_logout',
```

---

## 🚀 Run Karna

```bash
# Appium server start karo (alag terminal mein)
appium --port 4723 --use-drivers uiautomator2

# Main automation chalao
npm start

# Ya specific SrNo se start karo (resume support)
ts-node src/main.ts --from 25
```

---

## 📊 Output Files

| File | Content |
|------|---------|
| `data/users.xlsx` | Original data + Status/Step/Error/Timestamp columns |
| `reports/report.json` | Complete JSON summary |
| `reports/report.csv` | CSV format for Excel/Sheets |
| `logs/automation.log` | Full debug log |
| `logs/errors.log` | Errors only |
| `screenshots/` | Failure ke waqt captured screenshots |

### Excel Status Colors
- 🟢 **GREEN** = SUCCESS
- 🟡 **ORANGE** = FAILED_LOGIN (wrong password / auth error)
- 🔴 **RED** = FAILED_STEP (UI issue / timeout)

---

## 🔄 Status Codes

| Status | Matlab |
|--------|--------|
| `SUCCESS` | Login + Check-In + Logout — sab complete |
| `FAILED_LOGIN` | Username/password galat tha |
| `FAILED_STEP` | Login toh hua lekin check-in/logout fail |

---

## 💡 Common Issues

### "Element not found"
→ Resource-id galat hai. Appium Inspector se dobara check karo.

### "Connection refused"
→ Appium server nahi chal raha. `appium --port 4723` run karo.

### "Device not found"
→ USB debugging ON karo, `adb devices` se check karo.

### Slow performance
→ `TIMEOUTS.elementWait` badha do (e.g., 15000).

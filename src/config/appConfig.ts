// ============================================================
//  appConfig.ts — Speed optimized + @ fix
// ============================================================

export const APPIUM_CONFIG = {
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  logLevel: 'error' as const,
};

export const CAPABILITIES = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'My Phone',
  'appium:udid': 'R8VY2010Y8A',
  'appium:platformVersion': '16',
  'appium:appPackage': 'com.hisdu.emr.application',
  'appium:appActivity': 'com.hisdu.emr.application.activities.LoginActivity',
  'appium:noReset': true,
  'appium:fullReset': false,
  'appium:dontStopAppOnReset': true,
  'appium:newCommandTimeout': 120,
  'appium:adbExecTimeout': 30000,
  'appium:androidInstallTimeout': 90000,
  'appium:uiautomator2ServerLaunchTimeout': 60000,
  'appium:uiautomator2ServerInstallTimeout': 60000,
  'appium:disableWindowAnimation': true,
  'appium:skipUnlock': true,
  'appium:autoGrantPermissions': true,
  'appium:ignoreHiddenApiPolicyError': true,
  // @ fix ke liye — keyboard disable
  'appium:unicodeKeyboard': false,
  'appium:resetKeyboard': false,
};

export const LOCATORS = {
  login: {
    usernameInput: 'com.hisdu.emr.application:id/mEmailView',
    passwordInput: 'com.hisdu.emr.application:id/mPasswordView',
    loginButton:   'com.hisdu.emr.application:id/mSignInReg',
    errorMessage:  'com.hisdu.emr.application:id/mErrorMessage',
    errorKeywords: ['invalid', 'incorrect', 'wrong', 'failed',
                    'unauthorized', 'error', 'password', 'username'],
  },
  dashboard: {
    welcomeText:    'com.hisdu.emr.application:id/username',
    recyclerView:   'com.hisdu.emr.application:id/recyclerView',
    cardView:       'com.hisdu.emr.application:id/cardView',
    moduleTitle:    'com.hisdu.emr.application:id/moduleTitle',
    logoutButton:   'com.hisdu.emr.application:id/logout',
    drawerLayout:   'com.hisdu.emr.application:id/drawer_layout',
    backButton:     'com.hisdu.emr.application:id/backbutton',
  },
  checkin: {
    cardTitle: 'Check In',
  },
  checkout: {
    cardTitle: 'Check Out',
  },
};

export const TIMEOUTS = {
  elementWait:    500,  // Element wait
  shortWait:       500,  // Short pause
  loginTimeout:   100,  // Login result wait
  checkInTimeout:  500,  // Card tap wait
  retryDelay:      500,
  maxRetries:          1,
  typeDelay:         50,
};

export const PATHS = {
  excelInput:     './data/users.xlsx',
  excelOutput:    './data/users.xlsx',
  screenshotsDir: './screenshots',
  logsDir:        './logs',
  reportJson:     './reports/report.json',
  reportCsv:      './reports/report.csv',
};

export const APP_PACKAGE = 'com.hisdu.emr.application';

export const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--no-first-run',
    `--window-size=1280,800`,
    '--window-position=0,0',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-skip-list',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-notifications',
    '--disable-extensions',
    '--force-color-profile=srgb',
    '--mute-audio',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--enable-features=NetworkService,NetworkServiceInProcess'
]

export const SOC_URL = 'https://sa.ucla.edu/ro/public/soc'
export const SOC_NAME_LENGTH = 7
export const SOC_ELEMENT_SELECTOR = '#block-mainpagecontent > div > div > div > div > ucla-sa-soc-app'
export const SUBJECT_CODE_TO_FULL_NAME_PATH = 'subjectCodeToFullName.json'
export const CURRENT_QTR = '23W'
export const SUBJECT_AREA_TO_COURSES = 'subjectAreaURLs.json'
export const CLASS_TO_REQUEST = "classToRequest.json"
export const CLASS_TO_REQUEST_LOG = "classToRequestErrorLog.txt"

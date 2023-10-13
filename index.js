import fs from 'fs'
import puppeteer from 'puppeteer-extra'
import * as dotenv from 'dotenv'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import jsdom from "jsdom"
import { CURRENT_QTR, PUPPETEER_ARGS, SOC_NAME_LENGTH, SOC_URL, SUBJECT_CODE_TO_FULL_NAME_PATH, SOC_ELEMENT_SELECTOR, SUBJECT_AREA_TO_COURSES } from './constants.js'
dotenv.config()

async function getSubjectAreasForQuarter(browser, quarterTermValue, file) {
    const subjectCodeToFullName = {
        _quarter: quarterTermValue
    };
    const page = await browser.newPage()
    await page.goto(SOC_URL, { waitUntil: 'networkidle0' })

    // Select quarter term and search by subject area
    await page.evaluate((quarterTermValue, SOC_ELEMENT_SELECTOR) => {
        const SOCDOMElement = document.querySelector(SOC_ELEMENT_SELECTOR).shadowRoot
        SOCDOMElement.querySelector("#optSelectTerm").value = quarterTermValue
        SOCDOMElement.querySelector('#search_by').value = 'subject'
    }, quarterTermValue, SOC_ELEMENT_SELECTOR)

    await page.waitForNetworkIdle()

    const rawSubjectAreaData = await page.evaluate((SOC_ELEMENT_SELECTOR) => {
        return document
            .querySelector(SOC_ELEMENT_SELECTOR)
            .shadowRoot.querySelector('#select_filter_subject').getAttribute('options')
    }, SOC_ELEMENT_SELECTOR)

    for (const { value, text } of JSON.parse(rawSubjectAreaData)) {
        subjectCodeToFullName[value.trim()] = text.trim()
    }

    fs.writeFileSync(file, JSON.stringify(subjectCodeToFullName, null, 2))
}

export function generateSocUrl(subjectAreaLongName, subjectAreaShortName, quarter) {
    const paddedShortName = subjectAreaShortName.padEnd(SOC_NAME_LENGTH, '+')
    return `${SOC_URL}/Results?SubjectAreaName=${subjectAreaLongName}+(${subjectAreaShortName}) \
        &t=${quarter}&sBy=subject&subj=${paddedShortName}&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex`
}

function generateSubjectAreaURLs(subjectCodeToFullName, file) {
    const subjectAreaURLs = {
        _quarter: subjectCodeToFullName._quarter
    }
    for (const [subjectCode, subjectFullName] of Object.entries(subjectCodeToFullName)) {
        if (subjectCode === "_quarter") {
            continue
        }
        const longSubjectName = subjectFullName.split("(")[0].trim()
        subjectAreaURLs[subjectCode] = generateSocUrl(longSubjectName, subjectCode, CURRENT_QTR)
    }
    fs.writeFileSync(file, JSON.stringify(subjectAreaURLs, null, 2))
}

async function expandAll() {
    const button = document
        .querySelector(
            '#block-mainpagecontent > div > div > div > div > ucla-sa-soc-app'
        )
        .shadowRoot.querySelector('#expandAll')
    if (button === null) {
        return false
    }
    button.click()
    return true
}

// Capture the endpoints for each subject area page
async function captureSOCHTTPRequests(page) {
    // const requests = await collectAllNetworkRequests(page)
    const requestURLs = []
    await page.setRequestInterception(true)
    await page.on('request', request => {
        const requestURL = request.url()

        if (
            request.resourceType() === 'xhr' &&
            requestURL.startsWith(`${SOC_URL}/Results/GetCourseSummary?`)
        ) {
            requestURLs.push(requestURL)
        }
        // See: https://github.com/puppeteer/puppeteer/issues/3853
        return Promise.resolve()
            .then(() => request.continue())
            .catch(e => { })
    })
    // page.on('response', async response => {
    //     const responseURL = response.url()
    //     if (
    //         response.resourceType() === 'xhr' &&
    //         response.startsWith(`${SOC_URL}/Results/GetCourseSummary?`)
    //     ) {
    //         const content = await response.text();
    //     }
    //     // console.log(content)
    // })
    await page.waitForNetworkIdle()

    // Click the "expand all" button
    await page.waitForSelector(
        '#block-mainpagecontent > div > div > div > div > ucla-sa-soc-app'
    )
    const expandAllExists = await page.evaluate(expandAll)
    if (!expandAllExists) return []

    await page.waitForNetworkIdle()
    return requestURLs
}

// Captures requests accounting for multiple pages (pagination)
async function captureWithPagination(browser, SOCPage) {
    // Go to the SOC Page in a new tab
    const page = await browser.newPage()
    await page.goto(SOCPage)
    await page.waitForNetworkIdle()

    let [currPage, numberOfPages] = [0, -1]
    const socRequestURLs = []
    do {
        // Append requests from page to socRequestURLs
        const SOC_HTTP_requests = await captureSOCHTTPRequests(page)
        socRequestURLs.push(...SOC_HTTP_requests)

        // Calculate number of pages AND go to next page at the same time
        numberOfPages = await page.evaluate(currPage => {
            let numberOfPages = -1
            try {
                const pageHandlers = document
                    .querySelector(
                        '#block-mainpagecontent > div > div > div > div > ucla-sa-soc-app'
                    )
                    .shadowRoot.querySelectorAll(
                        '#divPagination > div:nth-child(2) > ul > li > button'
                    )
                // Get number of pages
                numberOfPages = Array.from(pageHandlers).length

                // Attempt to go to the next page afterwards
                pageHandlers[currPage].click()
            } catch (err) { }
            return numberOfPages
        }, currPage)

        // Increment page counter
        currPage += 1
        await page.waitForNetworkIdle()
    } while (currPage <= numberOfPages || numberOfPages === -1)

    await page.close()

    // Remove any possible duplicates
    const uniqueSocRequestURLs = new Set(socRequestURLs)
    return [...uniqueSocRequestURLs]
}

function getURLParams(url) {
    // Extract the query string from the URL
    const queryString = url.split('?')[1];

    // Check if there are any query parameters
    if (!queryString) {
        return {};
    }
    // Split the query string into individual key-value pairs
    const params = queryString.split('&');

    // Initialize an empty object to store the parameters
    const paramsObject = {};

    // Iterate through each key-value pair and populate the paramsObject
    params.forEach(param => {
        const [key, value] = param.split('=');
        paramsObject[key] = decodeURIComponent(value);
    });

    return paramsObject;
}

async function generateClassToRequestMap(browser, subjectAreaURLs) {
    const parallelRequests = 5
    const classToRequestMap = {};
    const subjectAreaURLsArray = Object.entries(subjectAreaURLs)
    const subjectAreaURLsArrayLength = subjectAreaURLsArray.length
    for (let i = 0; i < subjectAreaURLsArrayLength; i += parallelRequests) {
        const promises = []
        for (let j = i; j < i + parallelRequests && j < subjectAreaURLsArrayLength; j++) {
            const [subjectCode, subjectAreaURL] = subjectAreaURLsArray[j]
            promises.push((async () => {
                const subjectAreaData = await captureWithPagination(browser, subjectAreaURL);
                return { data: subjectAreaData, subjectCode: subjectCode }
            })())
        }
        const requests = await Promise.all(promises)
        console.log(requests);
        for (let j = 0; j < requests.length; j++) {
            const { data, subjectCode } = requests[j]
            for (let k = 0; k < data.length; k++) {
                const request = data[k]
                const subjectCodeNoSpace = subjectCode.split(" ").join("");
                const classNumber = JSON.parse(getURLParams(request).model).Path.match(new RegExp(`${subjectCodeNoSpace}(\\w*(\\w+))`))?.slice(1, 3);
                console.log(JSON.parse(getURLParams(request).model).Path)
                console.log(`${subjectCode} ${classNumber}`)
                console.log(request)
                const key = `${subjectCode} ${classNumber}`
                if (!classToRequestMap.hasOwnProperty(key)) {
                    classToRequestMap[key] = [request]
                } else {
                    classToRequestMap[key].push(request)
                }
            }
        }
        console.log('Finished', i, 'out of', subjectAreaURLsArrayLength)
        // console.log(classToRequestMap)
    }
    return classToRequestMap
}

async function generateClassToDetailsURLMap(endpointsMap) {

    // For each course, group the class details page URLs for each section type (e.g. group all lecture page urls together and all discussion page urls)
    const classToDetailsURLMap = {}
    for (const classCode in endpointsMap) {
        for (const endpoint of endpointsMap[classCode]) {
            const response = await fetch(endpoint);
            const content = await response.text();
            const htmlDoc = new jsdom.JSDOM(content);
            const aObjects = htmlDoc.window.document.links;
            for (const a of aObjects) {

                // 3 letter code representing type of section, such Lec, Lab, Dis, Tut, Sem etc.
                const sectionType = a.text.split(" ")[0]

                const url = a.href
                if (url.startsWith("/ro/")) {
                    if (!classToDetailsURLMap.hasOwnProperty(classCode)) {
                        classToDetailsURLMap[classCode] = {}
                    }
                    if (!classToDetailsURLMap[classCode].hasOwnProperty(sectionType)) {
                        classToDetailsURLMap[classCode][sectionType] = []
                    }
                    classToDetailsURLMap[classCode][sectionType].push("https://sa.ucla.edu" + url)
                }
            }
        }
    }
    return classToDetailsURLMap;
}

async function verifyCacheExists(file, qtr) {
    return JSON.parse(fs.readFileSync(file))?._quarter === qtr
}

async function main() {
    puppeteer.use(StealthPlugin())
    const browser = await puppeteer.launch({
        headless: false,
        args: PUPPETEER_ARGS
    })
    // Check if subject areas have been scraped for current quarter
    if (!verifyCacheExists(SUBJECT_CODE_TO_FULL_NAME_PATH, CURRENT_QTR)) {
        console.log("Getting subject areas for current quarter")
        await getSubjectAreasForQuarter(browser, CURRENT_QTR, SUBJECT_CODE_TO_FULL_NAME_PATH)
    }
    const subjectCodeToFullName = JSON.parse(fs.readFileSync(SUBJECT_CODE_TO_FULL_NAME_PATH))

    // Gather links for all courses in given subject area
    if (!verifyCacheExists(SUBJECT_AREA_TO_COURSES, CURRENT_QTR)) {
        console.log("Gathering subject area links")
        generateSubjectAreaURLs(subjectCodeToFullName, SUBJECT_AREA_TO_COURSES);
    }
    const subjectAreaURLs = JSON.parse(fs.readFileSync('subjectAreaURLs.json'))

    const classToRequestMap = await generateClassToRequestMap(browser, subjectAreaURLs)
    const classToDetailsURLMap = await generateClassToDetailsURLMap(classToRequestMap)

    console.log(classToDetailsURLMap);

    await browser.close()
}

main();

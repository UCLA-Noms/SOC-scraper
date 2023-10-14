import fs from 'fs'
import puppeteer from 'puppeteer-extra'
import * as dotenv from 'dotenv'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import jsdom from "jsdom"
import { CURRENT_QTR, PUPPETEER_ARGS, SOC_NAME_LENGTH, SOC_URL, SUBJECT_CODE_TO_FULL_NAME_PATH, SOC_ELEMENT_SELECTOR, SUBJECT_AREA_TO_COURSES, CLASS_TO_REQUEST, CLASS_TO_REQUEST_LOG } from './constants.js'
import { getSubjectAreaToSOCURL } from './subjectArea.js'
import { getCapturedSOCRequests } from './SOCRequestCapture.js'
dotenv.config()

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

// Get a specific URLs requests, utility method for dealing with errors
async function getSubjectAreaData(subjectCode, subjectAreaURL, file) {
    const classToRequestMap = JSON.parse(fs.readFileSync(subjectAreaURL));
    try {
        const subjectAreaData = await captureWithPagination(browser, subjectAreaURL);
        const capturedData = { data: subjectAreaData, subjectCode: subjectCode }

        const request = data[k]
        const subjectCodeNoSpace = subjectCode.split(" ").join("");
        const classNumber = JSON.parse(getURLParams(request).model).Path.match(new RegExp(`${subjectCodeNoSpace}(\\w*(\\w+))`))?.slice(1, 3);

        const key = `${subjectCode} ${classNumber}`
        if (!classToRequestMap.hasOwnProperty(key)) {
            classToRequestMap[key] = [request]
        } else {
            classToRequestMap[key].push(request)
        }
    } catch (e) {
        console.log(`Error:  ${e}`);
    }
}

async function main() {
    puppeteer.use(StealthPlugin())
    const browser = await puppeteer.launch({
        // headless: true,
        args: PUPPETEER_ARGS
    })

    console.log("Fetching subject area urls")
    const subjectAreaURLs = await getSubjectAreaToSOCURL(
        browser,
        CURRENT_QTR,
        SUBJECT_CODE_TO_FULL_NAME_PATH,
        SUBJECT_AREA_TO_COURSES
    )

    console.log("Gathering all captured SOC requests")
    const classToRequestMap = await getCapturedSOCRequests(
        browser,
        subjectAreaURLs,
        CURRENT_QTR,
        CLASS_TO_REQUEST,
        CLASS_TO_REQUEST_LOG
    )

    // const classToDetailsURLMap = await generateClassToDetailsURLMap(classToRequestMap)
    // console.log(classToDetailsURLMap);

    await browser.close()
}

main();

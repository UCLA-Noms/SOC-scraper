import fs from 'fs'
import puppeteer from 'puppeteer-extra'
import * as dotenv from 'dotenv'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import jsdom from "jsdom"
import { CURRENT_QTR, PUPPETEER_ARGS, SUBJECT_CODE_TO_FULL_NAME_PATH, SUBJECT_AREA_TO_COURSES, CLASS_TO_REQUEST, CLASS_TO_REQUEST_LOG, CLASS_CODE_TO_REQUEST_MAP } from './constants.js'
import { getSubjectAreaToSOCURL } from './subjectArea.js'
import { getCapturedSOCRequests } from './SOCRequestCapture.js'
import { getParsedMapByClassCode, parseFromSOCURL } from './parser.js'
import { formatData } from './formatClassData.js'
dotenv.config()

async function main() {
    puppeteer.use(StealthPlugin())
    const browser = await puppeteer.launch({
        headless: false,
        args: PUPPETEER_ARGS
    })

    console.log("Fetching subject area urls...")
    const subjectAreaURLs = await getSubjectAreaToSOCURL(
        browser,
        CURRENT_QTR,
        SUBJECT_CODE_TO_FULL_NAME_PATH,
        SUBJECT_AREA_TO_COURSES
    )

    console.log("Gathering all captured SOC requests...")
    const classToRequestMap = await getCapturedSOCRequests(
        browser,
        CURRENT_QTR,
        subjectAreaURLs,
        CLASS_TO_REQUEST,
        CLASS_TO_REQUEST_LOG
    )

    console.log("Generating mapping of class code to SOC resource...")
    const classCodeMap = await getParsedMapByClassCode(
        browser,
        CURRENT_QTR,
        classToRequestMap,
        CLASS_CODE_TO_REQUEST_MAP
    );

    // Example usage:
    // console.log(await parseFromSOCURL(classCodeMap["COM SCI 31"]["Dis 2A"]));
    console.log(JSON.stringify(await formatData(classCodeMap, browser), null, 4));

    await browser.close()
}

main();

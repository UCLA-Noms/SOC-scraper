import fs from 'fs'
import { verifyCacheExists } from "./util.js";
import { SOC_URL, SOC_NAME_LENGTH, SOC_ELEMENT_SELECTOR } from './constants.js';

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

function generateSocUrl(subjectAreaLongName, subjectAreaShortName, quarter) {
    const paddedShortName = subjectAreaShortName.padEnd(SOC_NAME_LENGTH, '+')
    return `${SOC_URL}/Results?SubjectAreaName=${subjectAreaLongName}+(${subjectAreaShortName}) \
        &t=${quarter}&sBy=subject&subj=${paddedShortName}&catlg=&cls_no=&undefined=Go&btnIsInIndex=btn_inIndex`
}

function generateSubjectAreaURLs(qtr, subjectCodeToFullName, file) {
    const subjectAreaURLs = {
        _quarter: subjectCodeToFullName._quarter
    }
    for (const [subjectCode, subjectFullName] of Object.entries(subjectCodeToFullName)) {
        if (subjectCode === "_quarter") {
            continue
        }
        const longSubjectName = subjectFullName.split("(")[0].trim()
        subjectAreaURLs[subjectCode] = generateSocUrl(longSubjectName, subjectCode, qtr)
    }
    fs.writeFileSync(file, JSON.stringify(subjectAreaURLs, null, 2))
}

export async function getSubjectAreaToSOCURL(browser, qtr, subjectAreaFile, outputFile) {
    // Check if subject areas have been scraped for current quarter
    if (!verifyCacheExists(subjectAreaFile, qtr)) {
        console.log("Getting subject areas for current quarter")
        await getSubjectAreasForQuarter(browser, qtr, subjectAreaFile)
    }
    const subjectCodeToFullName = JSON.parse(fs.readFileSync(subjectAreaFile))

    // Gather links for all courses in given subject area
    if (!verifyCacheExists(outputFile, qtr)) {
        console.log("Gathering subject area links")
        await generateSubjectAreaURLs(qtr, subjectCodeToFullName, outputFile);
    }
    return JSON.parse(fs.readFileSync(outputFile))
}
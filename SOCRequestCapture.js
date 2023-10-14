import fs from 'fs'
import { SOC_URL } from "./constants.js"
import { verifyCacheExists } from "./util.js"

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

async function generateClassToRequestMap(browser, subjectAreaURLs, file, errLog) {
    const { _quarter: _quarter, ...temp } = subjectAreaURLs
    subjectAreaURLs = temp
    const parallelRequests = 5
    const classToRequestMap = {
        _quarter: _quarter
    }
    const subjectAreaURLsArray = Object.entries(subjectAreaURLs)
    const subjectAreaURLsArrayLength = subjectAreaURLsArray.length

    for (let i = 0; i < subjectAreaURLsArrayLength; i += parallelRequests) {
        const promises = []
        for (let j = i; j < i + parallelRequests && j < subjectAreaURLsArrayLength; j++) {
            const [subjectCode, subjectAreaURL] = subjectAreaURLsArray[j]
            promises.push((async () => {
                try {
                    const subjectAreaData = await captureWithPagination(browser, subjectAreaURL);
                    return { data: subjectAreaData, subjectCode: subjectCode }
                } catch (e) {
                    const message = `[ERR] ${subjectCode} with url: ${subjectAreaURL} and error ${e} \n`
                    console.log(message)
                    fs.appendFileSync(errLog, message)
                    return {}
                }
            })())
        }
        const requests = await Promise.all(promises)

        for (let j = 0; j < requests.length; j++) {
            // Error with scraping, continue with other requests
            if (!requests[j].hasOwnProperty("data") || !requests[j].hasOwnProperty("subjectCode")) {
                continue;
            }
            const { data, subjectCode } = requests[j]
            for (let k = 0; k < data.length; k++) {
                const request = data[k]
                const subjectCodeNoSpace = subjectCode.split(" ").join("");
                const classNumber = JSON.parse(getURLParams(request).model).Path.match(new RegExp(`${subjectCodeNoSpace}(\\w*(\\w+))`))?.slice(1, 3);
                // console.log(JSON.parse(getURLParams(request).model).Path)
                // console.log(`${subjectCode} ${classNumber}`)
                // console.log(request)
                const key = `${subjectCode} ${classNumber}`
                if (!classToRequestMap.hasOwnProperty(key)) {
                    classToRequestMap[key] = [request]
                } else {
                    classToRequestMap[key].push(request)
                }
            }
        }
        fs.writeFileSync(file, JSON.stringify(classToRequestMap, null, 2))
        console.log('Finished', i, 'out of', subjectAreaURLsArrayLength)
    }
    return classToRequestMap
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

export async function getCapturedSOCRequests(browser, qtr, subjectAreaURLs, output, error) {
    // Convert subject area URLS into raw HTTP requests
    if (!verifyCacheExists(output, qtr)) {
        console.log("Capturing all HTTP Requests From All Subject Area Pages")
        await generateClassToRequestMap(
            browser,
            subjectAreaURLs,
            output,
            error
        )
    }
    return JSON.parse(fs.readFileSync(output));
}

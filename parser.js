import cheerio from 'cheerio'
import axios from 'axios'
import fs from 'fs'

export async function parseFromSOCURL(SOCURL, browser) {
    // Request the data from the SOC URL
    const res = await axios.get(SOCURL).catch(err => console.error(err))
    if (res == null || (res.status < 200 || res.status >= 300)) {
        console.error(`An error occurred trying to get the data from the URL ${SOCURL}`)
        console.error(res)
    }
    const { data } = res

    // Parse the HTML
    const $ = cheerio.load(data)

    // TO-DO: Handle cases where no results are available
    // https://sa.ucla.edu/ro/public/soc/Results/GetCourseSummary?model={%22Term%22%3A%2223W%22%2C%22SubjectAreaCode%22%3A%22BIOSTAT%22%2C%22CatalogNumber%22%3A%220257M+%22%2C%22IsRoot%22%3Afalse%2C%22SessionGroup%22%3Anull%2C%22ClassNumber%22%3A%22+001++%22%2C%22SequenceNumber%22%3A%221%22%2C%22Path%22%3A%22535343200_BIOSTAT0257M%22%2C%22MultiListedClassFlag%22%3A%22n%22%2C%22Token%22%3A%22MDI1NyAgTSA1MzUzNDMyMDBfQklPU1RBVDAyNTdN%22}&FilterFlags={%22enrollment_status%22%3A%22O%2CW%2CC%2CX%2CT%2CS%22%2C%22advanced%22%3A%22y%22%2C%22meet_days%22%3A%22M%2CT%2CW%2CR%2CF%22%2C%22start_time%22%3A%229%3A00+am%22%2C%22end_time%22%3A%226%3A00+pm%22%2C%22meet_locations%22%3Anull%2C%22meet_units%22%3Anull%2C%22instructor%22%3Anull%2C%22class_career%22%3Anull%2C%22impacted%22%3A%22N%22%2C%22enrollment_restrictions%22%3Anull%2C%22enforced_requisites%22%3Anull%2C%22individual_studies%22%3Anull%2C%22summer_session%22%3Anull}&_=1673747306027
    const hasNoResults = $('div.expanded-error-message').text().trim().includes('No results')
    if (hasNoResults) return null

    // Class ID & internal ID
    const classID = $('div').attr('id')?.match(/\w+/)[0]
    const internalIDs = $(`div#${classID}-children > div`).toArray().map(e => $(e).attr('id'))

    // Get the info for each lecture
    const elems = $(`div#${classID}-children > div`).toArray()
    const parsePromises = elems.map(async (e, index) => parseElem($, e, internalIDs[index], browser))
    const classesInfo = await Promise.all(parsePromises)

    return { classID, internalIDs, classesInfo       }
}

/**
 * Example: Select Computer Science (COM SCI) 31 - Introduction to Computer Science I Lec 1
 * We ignore the "Select" part of this
 * Group 1 - Match the department name - Computer Science
 * Group 2 - Match the short departent name - COM SCI
 * Group 3 - Match the course number in series - 31
 * Group 4 - Match the course description - Introduction to Computer Science I
 * Group 5 - Match the lecture section name
 */
const COURSE_NAME_REGEX =
    // /Select ([\w\s]+) (\(([\w\s]+)\)\s+)?([\w\d]+)\s+-\s+([\-\(\),:'\./\w\s]+) ((Lec|Lab|Sem|Dis|Tut|Act) (\d+))/
    /Select(?<courseLongCategory>[\w\s]+) (?<courseShortCategory>\(([\w\s]+)\)\s+)?(?<courseNumber>[\w\s]+)\s+-\s+(?<courseDescription>[.|!\$\?\-\(\),:"'a-zA-ZÀ-ÖÙ-öù-ÿĀ-žḀ-ỿ/\w\s]+) (?<lectureSection>(Lec|Lab|Sem|Dis|Tut|Act|Rgp|Stu|Fld|Qiz|Cli|Rec) ([\w\d]+))/

async function parseElem($, e, internalId, browser) {
    // Get if it's open & spots left
    const statusText = $(e).find(`div#${internalId}-status_data`).text().trim()
    const isOpen = statusText.includes('Open')
    const isWaitlist = statusText.includes('Waitlist')
    const isClosed = statusText.includes('Closed')
    if (isOpen) {
        var [openSeats, totalSeats] = statusText.match(/(\d+) of (\d+)/)?.slice(1)
    }
    else if (isWaitlist) {
        // TO-DO: Fix edge case for where the total seats is not shown
        // https://sa.ucla.edu/ro/public/soc/Results/GetCourseSummary?model=%7B%22Term%22%3A%2223W%22%2C%22SubjectAreaCode%22%3A%22ART++++%22%2C%22CatalogNumber%22%3A%220278++++%22%2C%22IsRoot%22%3Atrue%2C%22SessionGroup%22%3A%22%25%22%2C%22ClassNumber%22%3A%22%25%22%2C%22SequenceNumber%22%3Anull%2C%22Path%22%3A%22ART0278%22%2C%22MultiListedClassFlag%22%3A%22n%22%2C%22Token%22%3A%22MDI3OCAgICBBUlQwMjc4%22%7D&FilterFlags=%7B%22enrollment_status%22%3A%22O%2CW%2CC%2CX%2CT%2CS%22%2C%22advanced%22%3A%22y%22%2C%22meet_days%22%3A%22M%2CT%2CW%2CR%2CF%22%2C%22start_time%22%3A%228%3A00+am%22%2C%22end_time%22%3A%2210%3A00+pm%22%2C%22meet_locations%22%3Anull%2C%22meet_units%22%3Anull%2C%22instructor%22%3Anull%2C%22class_career%22%3Anull%2C%22impacted%22%3A%22N%22%2C%22enrollment_restrictions%22%3Anull%2C%22enforced_requisites%22%3Anull%2C%22individual_studies%22%3Anull%2C%22summer_session%22%3Anull%7D&_=1673746835338
        const hasClassFull = /Class Full \((\d+)\)/.test(statusText)
        if (hasClassFull) {
            var [totalSeats] = statusText.match(/Class Full \((\d+)\)/)?.slice(1)
        }
        else totalSeats = null

        const waitlistText = $(`div#${internalId}-waitlist_data`).text().trim()
        var [takenWaitlistSeats, totalWaitlistSeats] = waitlistText.match(/(\d+) of (\d+) Taken/)?.slice(1)
    }
    else if (isClosed) {
        const isClosedByDept = /Closed by Dept/.test(statusText)
        if (isClosedByDept) var totalSeats = 0
        else {
            var [totalSeats] = statusText.match(/Class Full \((\d+)\)/)?.slice(1)
        }
    }

    // Get waitlist status
    const waitlistText = $(e).find(`div#${internalId}-waitlist_data`).text()
    const isWaitlisted = !waitlistText.includes('No') && isWaitlist

    // Get days, time, location, units, and instructors
    const meetingDays = $(e).find(`div#${internalId}-days_data > p > button`).first().text().trim().split('')
    const meetingTime = $(e).find(`div#${internalId}-time_data > p`).text().trim()
    const location = $(e).find(`div#${internalId}-location_data`).text().trim()
    const units = $(e).find(`div#${internalId}-units_data`).text().trim()
    const instructors = $(e).find(`div#${internalId}-instructor_data`).text().trim()

    // Get prerequisite information

    // Get course name information
    const courseFullNameInfo = $(e).find('.screenReaderOnly').text().trim()
    let {
        courseLongCategory,
        courseShortCategory,
        courseNumber,
        courseDescription,
        lectureSection,
    } = courseFullNameInfo.match(COURSE_NAME_REGEX).groups

    // Handle the case where short category is same as course long name
    if (courseShortCategory == null) {
        // Short category is same as upper case long category
        courseShortCategory = courseLongCategory.toUpperCase();
    }
    courseShortCategory = courseShortCategory.replace("(", "").replace(")", "").trim()
    lectureSection = lectureSection.replace("Class", "").trim()
    let prereqInfoURL = null;
    let prereqs = null;
    if (lectureSection == "Lec 1") {
        prereqInfoURL = "https://sa.ucla.edu/" + $(e).find(`div.cls-section.click_info > p > a:contains('Lec 1')`).attr("href")
        console.log(prereqInfoURL)
        const page = await browser.newPage()
        await page.goto(prereqInfoURL)
        await page.waitForNetworkIdle()
        // const data = await page.evaluate(() => document.querySelector('*').outerHTML);

        // console.log(data);
        prereqs = await page.evaluate(() => {
            // console.log(document.querySelector('*').outerHTML)
            // const p = document.querySelector("table")?.innerHTML
            const p = Array.from(document
                .querySelector(
                    'ucla-sa-soc-app'
                )
                .shadowRoot
                .querySelectorAll("tr.course_requisites.scrollable-collapse > td > button.popover-right"),
                elem => elem.getAttribute("data-content"))
            // const p = Array.from(document.querySelectorAll("tr.course_requisites.scrollable-collapse > td > button.popover-right"), elem => elem.attr("data-content"))
            return p
        })
        
        // handle edge cases for prereq class names
        for (const i in prereqs) {
            if (prereqs[i] == "Software Construction Laboratory") {
                prereqs[i] = "Software Construction" // official name in SOC is Software Construction, but is listed as Software Construction Laboratory in prereqs
            }
        }
        console.log("prereqs")
        console.log(prereqs)

    }


    return {
        isOpen,
        isWaitlisted,
        isClosed,
        openSeats: +(openSeats ?? 0),
        totalSeats: +(totalSeats ?? 0),
        takenWaitlistSeats: takenWaitlistSeats ? +takenWaitlistSeats : null,
        totalWaitlistSeats: totalWaitlistSeats ? +totalWaitlistSeats : null,
        courseLongCategory,
        courseShortCategory,
        courseNumber,
        courseShortName: courseShortCategory + ' ' + courseNumber,
        courseLongName: courseDescription,
        lectureSection,
        meetingDays,
        meetingTime,
        location,
        units,
        instructors,
        prereqs
    }
}

export async function getParsedMapByClassCode(browser, qtr, SOCRequestsRawMap, output) {
    const { _quarter: _quarter, ...temp } = SOCRequestsRawMap
    SOCRequestsRawMap = temp
    const compiledRequests = Object.values(SOCRequestsRawMap).flat(1)

    // ------ Broken for 23W ----------
    // When have time, fix the regex to handle new edge case (439 to ~450):
    // https://sa.ucla.edu/ro/public/soc/Results/GetCourseSummary?model=%7B%22Term%22%3A%2223W%22%2C%22SubjectAreaCode%22%3A%22BIOINFO%22%2C%22CatalogNumber%22%3A%220201++++%22%2C%22IsRoot%22%3Atrue%2C%22SessionGroup%22%3A%22%25%22%2C%22ClassNumber%22%3A%22%25%22%2C%22SequenceNumber%22%3Anull%2C%22Path%22%3A%22BIOINFO0201%22%2C%22MultiListedClassFlag%22%3A%22n%22%2C%22Token%22%3A%22MDIwMSAgICBCSU9JTkZPMDIwMQ%3D%3D%22%7D&FilterFlags=%7B%22enrollment_status%22%3A%22O%2CW%2CC%2CX%2CT%2CS%22%2C%22advanced%22%3A%22y%22%2C%22meet_days%22%3A%22M%2CW%2CF%22%2C%22start_time%22%3A%2210%3A00+am%22%2C%22end_time%22%3A%226%3A00+pm%22%2C%22meet_locations%22%3Anull%2C%22meet_units%22%3Anull%2C%22instructor%22%3Anull%2C%22class_career%22%3A%22G%22%2C%22impacted%22%3A%22N%22%2C%22enrollment_restrictions%22%3A%22n%22%2C%22enforced_requisites%22%3Anull%2C%22individual_studies%22%3Anull%2C%22summer_session%22%3Anull%7D&_=1697192908216

    // 421-470
    // 732-781
    // 1069-1118
    // 1119-1168
    // 1258-1307
    // 2111-2160
    // 2237-2286
    // 2423-2482
    // 2485-2534
    // 2543-2592
    // 2711-2760
    // 2983-3032
    // 3071-3120
    // 3335-3384
    // 3877-3926
    // 3927-2975

    const classToSOCRequestMapping = !fs.existsSync(output) ? { _quarter: _quarter } : JSON.parse(fs.readFileSync(output, 'utf8'));
    let count = 4448;

    if (count >= compiledRequests.length) {
        return classToSOCRequestMapping
    }

    for (const SOC_URL of compiledRequests.slice(count)) {
        try {
            const data = await parseFromSOCURL(SOC_URL)
            if (data === null) continue
            const { classesInfo } = data;

            for (const classInfo of classesInfo) {
                const { courseShortName, lectureSection } = classInfo
                if (classToSOCRequestMapping.hasOwnProperty(courseShortName)) {
                    classToSOCRequestMapping[courseShortName][lectureSection] = SOC_URL;
                } else {
                    classToSOCRequestMapping[courseShortName] = {
                        [lectureSection]: SOC_URL
                    }
                }
                console.log(courseShortName, count);
            }
            count += 1
        }
        catch (e) {
            console.error(e)
            console.log(SOC_URL)
            console.log(count)
            break
        }
    }

    fs.writeFileSync(output, JSON.stringify(classToSOCRequestMapping, null, 2))
    return classToSOCRequestMapping;
}

import { CURRENT_QTR } from "./constants.js";
import { parseFromSOCURL } from "./parser.js";

export async function formatData(classCodeMap, browser) {
    let count = 0;
    let res = {"classes": {}};
    for (const cls in classCodeMap) {
        if (!cls.startsWith("COM SCI") || !classCodeMap[cls].hasOwnProperty("Lec 1")) {
            continue;
        }
        console.log(classCodeMap[cls]);
        const initialInfo = await parseFromSOCURL(classCodeMap[cls]["Lec 1"], browser);
        // console.log(initialInfo)
        res["classes"][cls] = {
            "courseID": cls,
            "courseName": initialInfo["classesInfo"][0]["courseLongName"],
            "units": parseFloat(initialInfo["classesInfo"][0]["units"]),
            "departmentID": initialInfo["classesInfo"][0]["courseShortCategory"],
            "lectures": {},
            "prereqs": initialInfo["classesInfo"][0]["prereqs"]
        };
        // if (count == 1) {
        //     break;
        // }
        const sectionNumberMap = {};
        for (const section in classCodeMap[cls]) {      
            const sectionNumber = parseInt(section.split(" ")[1]);
            if (!sectionNumberMap.hasOwnProperty(sectionNumber)) {
                sectionNumberMap[sectionNumber] = []
            }
            sectionNumberMap[sectionNumber].push(section);
        }
        console.log("sectionNumberMap")
        console.log(sectionNumberMap);


        for (const sectionNum in sectionNumberMap) {            
            // console.log(section)
            for (const section of sectionNumberMap[sectionNum]) {
                console.log(section);
                // res["classes"][cls]["lectures"][section] = 
                if (section.startsWith("Lec")) {
                    let sectionInfo = await parseFromSOCURL(classCodeMap[cls][section], browser);
                    console.log(sectionInfo)
                    res["classes"][cls]["lectures"][sectionNum] = {
                        "internalID": sectionInfo["internalIDs"][0],
                        "lecture": sectionNum,
                        "professor": sectionInfo["classesInfo"][0]["instructors"],
                        "quarter": CURRENT_QTR,
                        "location": sectionInfo["classesInfo"][0]["location"],
                        "days": sectionInfo["classesInfo"][0]["meetingDays"],
                        "time": sectionInfo["classesInfo"][0]["meetingTime"],
                        "discussions": [],
                    };
                    // console.log(section);
                    // console.log(await parseFromSOCURL(classCodeMap[cls][section]));
                } else if (section.startsWith("Dis") || section.startsWith("Lab")) {
                    let discInfo = await parseFromSOCURL(classCodeMap[cls][section], browser);
                    console.log(discInfo);
                    for (const [index, disc] of discInfo["classesInfo"].entries()) {
                        res["classes"][cls]["lectures"][sectionNum]["discussions"].push({
                            "internalID": discInfo["internalIDs"][index],
                            "quarter": CURRENT_QTR,
                            "section": disc["lectureSection"].split(" ")[1],
                            "ta": disc["instructors"],
                            "location": disc["location"],
                            "days": disc["meetingDays"],
                            "time": disc["meetingTime"]
                        });
                    }
                    break;
                }
            }
            
        }
        count += 1;
    }
    return res;
}
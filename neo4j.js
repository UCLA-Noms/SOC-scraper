import * as neo4j from "neo4j-driver"
import * as dotenv from "dotenv";
dotenv.config();
// require("dotenv").config();
// const express = require("express");
// const app = express();
// const port = 8080;
// var cors = require('cors');
// app.use(cors());
// app.use(express.json());

// app.listen(port, () => {
//     console.log(`Listening on port ${port}`);
// });

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

// const neo4j = require("neo4j-driver");

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();
const sampleData = [
`
{
    "classes": {
        "COM SCI 35L": {
            "courseID": "COM SCI 35L",
            "courseName": "Software Construction",
            "units": 4,
            "departmentID": "COM SCI",
            "lectures": {
                "1": {
                    "internalID": "187105200_COMSCI0035L",
                    "lecture": "1",
                    "professor": "Eggert, P.R.",
                    "quarter": "23F",
                    "location": "Young Hall CS50",
                    "days": [
                        "M",
                        "W"
                    ],
                    "time": "4pm-5:50pm",
                    "discussions": [
                        {
                            "internalID": "187105201_187105200_COMSCI0035L",
                            "quarter": "23F",
                            "section": "1A",
                            "ta": "Qiu, Y.",
                            "location": "Perloff Hall 1102",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187105202_187105200_COMSCI0035L",
                            "quarter": "23F",
                            "section": "1B",
                            "ta": "Shi, Z.",
                            "location": "Rolfe Hall 1200",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187105203_187105200_COMSCI0035L",
                            "quarter": "23F",
                            "section": "1C",
                            "ta": "Yu, J.",
                            "location": "Dodd Hall 175",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187105204_187105200_COMSCI0035L",
                            "quarter": "23F",
                            "section": "1D",
                            "ta": "Zhou, Z.",
                            "location": "Public Affairs Building 2214",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187105205_187105200_COMSCI0035L",
                            "quarter": "23F",
                            "section": "1E",
                            "ta": "Tang, M.",
                            "location": "Kaufman Hall 101",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        }
                    ]
                }
            },
            "prereqs": [
                "Introduction to Computer Science I"
            ]
        }
    }
}
`,`
{
    "classes": {
        "COM SCI 111": {
            "courseID": "COM SCI 111",
            "courseName": "Operating Systems Principles",
            "units": 5,
            "departmentID": "COM SCI",
            "lectures": {
                "1": {
                    "internalID": "187336200_COMSCI0111",
                    "lecture": "1",
                    "professor": "Eggert, P.R.",
                    "quarter": "23F",
                    "location": "Franz Hall 1178",
                    "days": [
                        "T",
                        "R"
                    ],
                    "time": "2pm-3:50pm",
                    "discussions": [
                        {
                            "internalID": "187336201_187336200_COMSCI0111",
                            "quarter": "23F",
                            "section": "1A",
                            "ta": "Cao, Y.",
                            "location": "Geology Building 4660",
                            "days": [
                                "F"
                            ],
                            "time": "10am-11:50am"
                        },
                        {
                            "internalID": "187336202_187336200_COMSCI0111",
                            "quarter": "23F",
                            "section": "1B",
                            "ta": "Roysar, B.",
                            "location": "Broad Art Center 2100A",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187336103_187336200_COMSCI0111",
                            "quarter": "23F",
                            "section": "1C",
                            "ta": "Cao, Y.",
                            "location": "Public Affairs Building 2270",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187336104_187336200_COMSCI0111",
                            "quarter": "23F",
                            "section": "1D",
                            "ta": "Roysar, B.",
                            "location": "Rolfe Hall 3135",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        }
                    ]
                }
            },
            "prereqs": [
                "Introduction to Computer Science II",
                "Introduction to Computer Organization",
                "Software Construction"
            ]
        }
    }
}
`,`
{
    "classes": {
        "COM SCI 32": {
            "courseID": "COM SCI 32",
            "courseName": "Introduction to Computer Science II",
            "units": 4,
            "departmentID": "COM SCI",
            "lectures": {
                "1": {
                    "internalID": "187096200_COMSCI0032",
                    "lecture": "1",
                    "professor": "Stahl, H.A.",
                    "quarter": "23F",
                    "location": "Moore Hall 100",
                    "days": [
                        "M",
                        "W"
                    ],
                    "time": "4pm-5:50pm",
                    "discussions": [
                        {
                            "internalID": "187096201_187096200_COMSCI0032",
                            "quarter": "23F",
                            "section": "1A",
                            "ta": "Hung, L.",
                            "location": "Haines Hall A2",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187096202_187096200_COMSCI0032",
                            "quarter": "23F",
                            "section": "1B",
                            "ta": "Lu, D.Y.",
                            "location": "Haines Hall A18",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187096203_187096200_COMSCI0032",
                            "quarter": "23F",
                            "section": "1C",
                            "ta": "Long, Q.",
                            "location": "Haines Hall 39",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187096204_187096200_COMSCI0032",
                            "quarter": "23F",
                            "section": "1D",
                            "ta": "Tang, J.",
                            "location": "Haines Hall A18",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187096205_187096200_COMSCI0032",
                            "quarter": "23F",
                            "section": "1E",
                            "ta": "Zhang, J.",
                            "location": "Dodd Hall 175",
                            "days": [
                                "F"
                            ],
                            "time": "4pm-5:50pm"
                        }
                    ]
                }
            },
            "prereqs": [
                "Introduction to Computer Science I"
            ]
        }
    }
}`,`
{
    "classes": {
        "COM SCI 31": {
            "courseID": "COM SCI 31",
            "courseName": "Introduction to Computer Science I",
            "units": 4,
            "departmentID": "COM SCI",
            "lectures": {
                "1": {
                    "internalID": "187093200_COMSCI0031",
                    "lecture": "1",
                    "professor": "Smallberg, D.A.",
                    "quarter": "23F",
                    "location": "La Kretz Hall 110",
                    "days": [
                        "M",
                        "W"
                    ],
                    "time": "2pm-3:50pm",
                    "discussions": [
                        {
                            "internalID": "187093201_187093200_COMSCI0031",
                            "quarter": "23F",
                            "section": "1A",
                            "ta": "Chen, G.",
                            "location": "La Kretz Hall 110",
                            "days": [
                                "F"
                            ],
                            "time": "10am-11:50am"
                        },
                        {
                            "internalID": "187093202_187093200_COMSCI0031",
                            "quarter": "23F",
                            "section": "1B",
                            "ta": "Wang, W.",
                            "location": "Royce Hall 190",
                            "days": [
                                "F"
                            ],
                            "time": "10am-11:50am"
                        },
                        {
                            "internalID": "187093203_187093200_COMSCI0031",
                            "quarter": "23F",
                            "section": "1C",
                            "ta": "Harel-Canada, F.",
                            "location": "Bunche Hall 2209A",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187093204_187093200_COMSCI0031",
                            "quarter": "23F",
                            "section": "1D",
                            "ta": "Galvez, I.C.",
                            "location": "Royce Hall 190",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187093205_187093200_COMSCI0031",
                            "quarter": "23F",
                            "section": "1E",
                            "ta": "No instructors",
                            "location": "Bunche Hall",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187093206_187093200_COMSCI0031",
                            "quarter": "23F",
                            "section": "1F",
                            "ta": "Chen, Y.",
                            "location": "Dodd Hall 121",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        }
                    ]
                },
                "2": {
                    "internalID": "187093200_COMSCI0031",
                    "lecture": "2",
                    "professor": "Smallberg, D.A.",
                    "quarter": "23F",
                    "location": "La Kretz Hall 110",
                    "days": [
                        "M",
                        "W"
                    ],
                    "time": "2pm-3:50pm",
                    "discussions": [
                        {
                            "internalID": "187093211_187093210_COMSCI0031",
                            "quarter": "23F",
                            "section": "2A",
                            "ta": "Li, X.",
                            "location": "Dodd Hall 147",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187093212_187093210_COMSCI0031",
                            "quarter": "23F",
                            "section": "2B",
                            "ta": "Yang, C.",
                            "location": "Haines Hall 118",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187093213_187093210_COMSCI0031",
                            "quarter": "23F",
                            "section": "2C",
                            "ta": "No instructors",
                            "location": "Franz Hall",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187093214_187093210_COMSCI0031",
                            "quarter": "23F",
                            "section": "2D",
                            "ta": "No instructors",
                            "location": "Fowler Museum at UCLA",
                            "days": [
                                "F"
                            ],
                            "time": "12pm-1:50pm"
                        },
                        {
                            "internalID": "187093215_187093210_COMSCI0031",
                            "quarter": "23F",
                            "section": "2E",
                            "ta": "Chauhan, J.",
                            "location": "Haines Hall A2",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        },
                        {
                            "internalID": "187093216_187093210_COMSCI0031",
                            "quarter": "23F",
                            "section": "2F",
                            "ta": "No instructors",
                            "location": "Fowler Museum at UCLA",
                            "days": [
                                "F"
                            ],
                            "time": "2pm-3:50pm"
                        }
                    ]
                }
            },
            "prereqs": []
        }
    }
}`
];


// app.post("/importdata", async (req, res) => {
//     let data = req.body;
//     console.log(data);
//     await importFromJSON(data).then((result) => res.send("done importing data"));

// });

// app.get("/importdatatest", async (req, res) => {
//     for (const sample of sampleData) {
//         await importFromJSON(JSON.parse(sample));
//     }
//     res.send("done importing data");
//     session.close();
// });

// app.get("/closeconnection", (req, res) => {
//     driver.close();
// });

// export default async function importAll(dataArr) {
//     for (data of dataArr) {
//         await importFromJSON(data);
//     }
// }

export default async function importFromJSON(data) {
    const classes = data.classes;
    console.log(classes)
    try {
        for (let cls in classes) {
            cls = classes[cls];
            console.log("creating/updating course node")
            console.log(cls)
            let result = await session.run(
                `
                MERGE (c:Course {Name: "${cls.courseName}"})
                ON CREATE SET c.CourseID = "${cls.courseID}", c.Units = "${cls.units}", c.Department = "${cls.departmentID}", c.Description = "${cls.courseDescription}", c.CoursePageLink = "${cls.coursePageLink}", c.AvailabilityLink = "${cls.courseAvailabilityLink}"
                ON MATCH SET c.CourseID = "${cls.courseID}", c.Units = "${cls.units}", c.Department = "${cls.departmentID}", c.Description = "${cls.courseDescription}", c.CoursePageLink = "${cls.coursePageLink}", c.AvailabilityLink = "${cls.courseAvailabilityLink}"
                `
            );
            console.log("creating/updating lecture and term nodes")
            for (const lecture in cls.lectures) {
                const lec = cls.lectures[lecture]
                console.log("lec")
                console.log(lec)
                result = await session.run(
                    `
                    MERGE (l1:Lecture {InternalID: "${lec.internalID}", Quarter: "${lec.quarter}"})
                    ON CREATE SET l1.Section = "${lec.lecture}", l1.Professor = "${lec.professor}", l1.Location = "${lec.location}", l1.Days = "${lec.days.join(",")}", l1.Time = "${lec.time}"
                    ON MATCH SET l1.Section = "${lec.lecture}", l1.Professor = "${lec.professor}", l1.Location = "${lec.location}", l1.Days = "${lec.days.join(",")}", l1.Time = "${lec.time}"
                    MERGE (c1:Course {CourseID: "${cls.courseID}"}) MERGE (l1)-[:FROM_COURSE]->(c1)
                    MERGE (t1:Term {Quarter: "${lec.quarter}"}) MERGE (l1)-[:TAUGHT_IN]->(t1)`
                );
                console.log("creating discussion node/relationships")
                for (const discussion of lec.discussions) {
                    result = await session.run(
                        `
                        MERGE (d1:Discussion {InternalID: "${discussion.internalID}", Quarter: "${discussion.quarter}"})
                        ON CREATE SET d1.Section = "${discussion.section}", d1.TA = "${discussion.ta}", d1.Location = "${discussion.location}", d1.Days = "${discussion.days.join(",")}", d1.Time = "${discussion.time}"
                        ON MATCH SET d1.Section = "${discussion.section}", d1.TA = "${discussion.ta}", d1.Location = "${discussion.location}", d1.Days = "${discussion.days.join(",")}", d1.Time = "${discussion.time}"
                        MERGE (l1:Lecture {Section: "${lec.lecture}", Professor: "${lec.professor}", Location: "${lec.location}", Days: "${lec.days.join(",")}", Time: "${lec.time}", Quarter: "${lec.quarter}"}) MERGE (l1)-[:HAS_DISCUSSION]->(d1)
                        MERGE (t1:Term {Quarter: "${lec.quarter}"}) MERGE (d1)-[:TAUGHT_IN]->(t1)`
                    );
                }
            }
            // console.log("creating course lecture relationship")
            console.log("creating prereq relationships")
            for (const prereq of cls.prereqs) {
                console.log("prereq")
                console.log(prereq)
                result = await session.run(
                    `MERGE (c1:Course {Name: "${prereq}"}) MERGE (c2:Course {CourseID: "${cls.courseID}"}) MERGE (c1)-[:IS_PREREQ_OF]->(c2)`
                );
            }
            console.log("done");
        }
    } finally {
        // await session.close();
    }
    console.log("done importing data");
    // on application exit:
    await session.close();
    await driver.close();
}


// test();

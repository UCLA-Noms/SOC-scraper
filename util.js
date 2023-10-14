import fs from 'fs'

export function verifyCacheExists(file, qtr) {
    if (!fs.existsSync(file)) return false
    return JSON.parse(fs.readFileSync(file))?._quarter === qtr
}

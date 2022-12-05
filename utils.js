const fs = require("fs")
const path = require("path")

function getAllFiles(dirpath, res) {
    var files = fs.readdirSync(dirpath)
    
    res = res || []
    
    files.forEach((file) => {
        if (fs.statSync(dirpath + "/" + file).isDirectory()) {
            var subdir = getAllFiles(dirpath + "/" + file, [])
            res.push({ name: file, path: path.join(dirpath, "/", file), type: "folder", content: subdir })
        } else {
            var code = fs.readFileSync(dirpath + "/" + file)
            res.push({ name: file, path: path.join(dirpath, "/", file), type: "file", codeBuffer: code })
        }
    })
    return res
}

module.exports.getAllFiles = getAllFiles
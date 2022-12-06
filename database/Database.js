const config = require("./config.json")
const loki = require("lokijs")
const { v4: uuidv4 } = require('uuid');
var crypto = require('crypto');
var DockerManager = require("../DockerManager").DockerManager

function hashPasswd(passwd) {
    return crypto.createHash('sha256').update(passwd).digest('base64');
}

class Database {
    constructor() {
        console.log("Base de données chargée depuis " + config.db_path)
        this.db = new loki(config.db_path, {
            autoload: true,
            autoloadCallback : () => {
                for (const collection in config["collections"]) {
                    if (Object.hasOwnProperty.call(config["collections"], collection)) {
                        const collection_name = config["collections"][collection];
                        var entries = this.db.getCollection(collection_name);
                        if (entries === null) entries = this.db.addCollection(collection_name);
                    }
                }
            },
            autosave: true,
            autosaveInterval: 4000
        });
    }

    addUser(name, passwd) {
        var users = this.db.getCollection("users")
        if (users.find({ name: { $eq: name } }).length == 0){
            var userId = uuidv4()
            users.insert({ _id: userId, name: name, passwd: hashPasswd(passwd) }) 
            this.db.saveDatabase()
            return userId
        } else {
            return 0
        }
    }

    userExist(name, passwd) {
        var users = this.db.getCollection("users")
        var res = users.findOne({ name: { $eq: name}, passwd: { $eq: hashPasswd(passwd)} })
        if (res != null) return res._id
        return -1
    }

    dnsnameIsFree(dnsname) {
        var posts = this.db.getCollection("posts")
        return (posts.find({ dnsname: { $eq: dnsname } }).length == 0)
    }

    addWebsite(userid, dnsname, ip, container_id) { 
        this.db.getCollection("posts").insert({ _id: uuidv4(), userId: userid, dnsname: dnsname, ip: ip , containerId: container_id })
        this.db.saveDatabase()
    }

    getUserIdOfWebsite(dnsname) {
        if (!this.dnsnameIsFree(dnsname)) {
            return this.db.getCollection("posts").findOne({ dnsname: { $eq: dnsname } }).userId
        } 
        return 0
    }

    getUsername(userid) {
        return this.db.getCollection("users").findOne({ _id: { $eq: userid}}).name
    }

    async getAllWebsites() {
        var sites = this.db.getCollection("posts").chain().simplesort("dnsname").data();
        var dm = new DockerManager()
        await dm.fetchContainers().then(async (res) => {
            for (var container_id in res) {
                for (var site in sites) {
                    if (res[container_id].Names[0] == "/container_" + sites[site]["dnsname"]) {
                        sites[site]["creatorName"] = await this.getUsername(sites[site].userId);
                        sites[site]["status"] = res[container_id].State
                        var ip = res[container_id].NetworkSettings.Networks.bridge.IPAddress
                        if (ip === ''){
                            sites[site]["ip"] = "Hors-ligne"
                        } else {
                            sites[site]["ip"] = ip
                        }
                    } else if (sites[res[container_id].Names[0].split("/container_")[1]] == undefined) {
                        var new_site = {}
                        var sitename = res[container_id].Names[0].split("/container_")[1]
                        new_site["dnsname"] = sitename;
                        new_site["creatorName"] = "Inconnu";
                        new_site["status"] = res[container_id].State
                        var ip = res[container_id].NetworkSettings.Networks.bridge.IPAddress
                        if (ip === ''){
                            new_site["ip"] = "Hors-ligne"
                        } else {
                            new_site["ip"] = ip
                        }
                        sites.push(new_site)
                    }
                }
            }
            return sites
        })
        return sites
    }

}

const db = new Database()

module.exports.db = db
module.exports.db_path = config.db_path
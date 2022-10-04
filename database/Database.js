const config = require("./config.json")
const loki = require("lokijs")
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor() {
        console.log("Base de données construite")
        this.db = new loki('./database/hermes.db', {
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
            users.insert({ _id: uuidv4(), name: name, passwd: passwd }) 
        } else {
            console.log("Cet utilisateur existe déjà")
        }
    }

    dnsnameIsFree(dnsname) {
        var posts = this.db.getCollection("posts")
        return (posts.find({ dnsname: { $eq: dnsname } }).length == 0)
    }

    addWebsite(dnsname, ip) { 
        this.db.getCollection("posts").insert({ dnsname: dnsname, ip: ip }) 
    }

    getAllWebsites() {
        return this.db.getCollection("posts").chain().simplesort("dnsname").data();
    }

}

const db = new Database()

module.exports.db = db
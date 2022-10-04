const creator = require("./DockerCreator.js");
const db = require("./database/Database").db;
const express = require("express")
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session')
const { v4: uuidv4 } = require('uuid');
const app = express()
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.use(fileUpload({ createParentPath: true }));
app.use(session({
    genid: function(req) {
      return uuidv4() // use UUIDs for session IDs
    },
    secret: 'keyboard cat'
}))

app.get('/', (req, res) => {
    res.render('pages/index', req.session.renderInfos == undefined ? {} : req.session.renderInfos )
    delete req.session.renderInfos
    req.session.save((err) => {if (err != undefined) console.log(err)})
})

app.post('/upload', (req, res) => {
    try {
        const regex = new RegExp('^([a-zA-z0-9])*\\.(\\w){2,}$', 'gm')
        var dnsname = req.body.dnsname.toLowerCase();
        if (req.body.dnsname == '') {
            returnError(res, "On dirait que tu n'as pas mis de nom de domaine")
            return
        } else if (dnsname.match(regex) == null) {
            returnError(res, "Ton nom de domaine n'est pas correct.. Il doit être écrit comme ceci: exemple.com")
            return
        }else if (!req.files) {
            returnError(res, "Aucun fichier zip transféré")
            return
        } else {
            var codezip = req.files.codezip;
            if (!db.dnsnameIsFree(dnsname)) {
                returnError(res, "Dommage, ce nom de domaine est déjà pris.. Essaye en un autre !")
                return
            }
            if (codezip.mimetype == "application/zip") {
                codezip.mv("./uploaded/" + dnsname + ".zip");
                try {
                    creator.deployWebsite(dnsname, "./uploaded/" + dnsname + ".zip", (err, ip) => {
                        if (err != undefined) {
                            returnError(res, "Une erreur est survenue, réessaye dans quelques minutes")
                            return
                        } else {
                            db.addWebsite(dnsname, ip)
                            res.status(200).send({ status: 200, path: "/launched", dnsname: dnsname, ip: ip })
                            return
                        }
                    })
                } catch (err) {
                    returnError(res, "Aïe ! Une erreur est survenue lors du déploiement du site")
                    return
                }
            } else {
                returnError(res, "Ton zip n'a pas l'air d'être un zip")
                return
            }
        }
    } catch (error) {
        console.log(error)
        returnError(res, "Une erreur est survenue, mais je n'en dirais pas plus")
        return
    }
})

app.get('/sites', (req, res) => {
    res.send({ websites: db.getAllWebsites() })
})

app.get('/launched/:dnsname/:ip', (req, res) => {
    if (req.params['dnsname'] != undefined && req.params['ip'] != undefined) {
        res.render("pages/launched", { dnsname: req.params['dnsname'], ip: req.params['ip']})
    } else {
        res.redirect("/")
    }
})

function returnError(res, error) {
    res.status(400).send({ status: 400, error: error })
}

app.listen(port, () => {
    console.log("Application lancée sur le port " + port)
})
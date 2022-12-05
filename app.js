const creator = require("./DockerCreator.js");
const getAllFiles = require("./utils").getAllFiles;
const {db: db, db_path: db_path} = require("./database/Database");
const express = require("express")
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session')
const LokiStore = require('connect-loki')(session);
const { v4: uuidv4 } = require('uuid');
const path = require("path")
const ejs = require("ejs")
const app = express()
const fse = require("fs-extra");
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.engine('html', ejs.renderFile)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.use(fileUpload({ createParentPath: true }));
app.use(session({
    genid: function(req) {
      return uuidv4() // use UUIDs for session IDs
    },
    store: new LokiStore({ path: db_path }),
    secret: 'UneChouetteVoleAuDessusDuCambodgeIlFaitNuitEtLArbreVientDeSEveiller',
    cookie: { sameSite: "strict" },
    saveUninitialized: false,
    resave: false
}))

// Middelware pour l'authentification
function isAuth(req, res, next) {
    if (req.session.user) next()
    else next("route")
}

app.get('/', async (req, res) => {
    res.render('pages/index', {
        websites: await db.getAllWebsites(), 
        userId: req.session.user 
    })
})

// Si l'utilisateur est connecté
app.get('/upload', isAuth, (req, res) => {
    res.render('pages/add_website', { username: db.getUsername(req.session.user)})
})

// Si l'utilisateur n'est pas connecté, on le redirige vers la page de connexion
app.get('/upload', (req, res) => {
    res.render('pages/connexion')
})

app.post('/upload', (req, res) => {
    if (req.session.user) {
        try {
            const regex = new RegExp('^([a-zA-z0-9\-\_])*\\.(\\w){2,}$', 'gm')
            var dnsname = req.body.dnsname.toLowerCase();
            if (req.body.dnsname == '') {
                returnInfo(res, 400, "On dirait que tu n'as pas mis de nom de domaine")
                return
            } else if (dnsname.match(regex) == null) {
                returnInfo(res, 400, "Ton nom de domaine n'est pas correct.. Il doit être écrit comme ceci: exemple.com")
                return
            }else if (!req.files) {
                returnInfo(res, 400, "Aucun fichier zip transféré")
                return
            } else {
                var codezip = req.files.codezip;
                if (!db.dnsnameIsFree(dnsname)) {
                    returnInfo(res, 400, "Dommage, ce nom de domaine est déjà pris.. Essaye en un autre !")
                    return
                }
                if (codezip.mimetype.includes("zip")) {
                    codezip.mv("./uploaded/" + dnsname + ".zip");
                    try {
                        creator.deployWebsite(dnsname, "./uploaded/" + dnsname + ".zip", (err, ip, container_id) => {
                            if (err != undefined) {
                                console.log(err)
                                returnInfo(res, 400, "Une erreur est survenue, réessaye dans quelques minutes")
                                return
                            } else {
                                db.addWebsite(req.session.user, dnsname, ip, container_id)
                                returnInfo(res, 200, "Ton site a bien été déployé !<br>Tu peux le trouver <a href='http://" + dnsname + "'>ici</a>")
                                return
                            }
                        })
                    } catch (err) {
                        returnInfo(res, 400, "Aïe ! Une erreur est survenue lors du déploiement du site")
                        return
                    }
                } else {
                    returnInfo(res, 400, "Ton zip n'a pas l'air d'être un zip")
                    return
                }
            }
        } catch (error) {
            console.log(error)
            returnInfo(res, 400, "Une erreur est survenue, mais je n'en dirai pas plus")
            return
        }
    } else {
        returnInfo(res, 400, "Bizarrement, tu n'es pas connecté.")
    }
})

// Si l'user est déjà connecté, on le redirige vers la page d'upload
app.get("/login", isAuth, (req, res) => {
    res.redirect("/upload")
})

app.get("/login", (req, res) => {
    res.render("pages/connexion")
})

app.post("/login", (req, res, next) => {
    var username = req.body.username
    var password = req.body.password
    var userId
    if ((userId = db.userExist(username, password)) != -1) {
        req.session.regenerate((err) => {
            if (err) next(err)
            req.session.user = userId
            console.log("userId: " + userId)
            
            req.session.save(function (err) {
              if (err) {return next(err)}
              res.redirect('/upload')
            })
        })
    } else {
        res.redirect("/login?error")
    }
})

// Si l'user est déjà connecté, on le redirige vers la page d'upload
app.get("/signup", isAuth, (req, res) => {
    res.redirect("/upload")
})

app.get("/signup", (req, res, next) => {
    res.render('pages/inscription')
})

app.post("/signup", (req, res, next) => {
    var username = req.body.username
    var password = req.body.password
    var userId
    if (password.length >= 5) {
        if ((userId = db.addUser(username, password)) != 0) {
            req.session.regenerate((err) => {
                if (err) next(err)
                req.session.user = userId
                console.log("userId: " + userId)
                
                req.session.save(function (err) {
                if (err) {return next(err)}
                res.redirect("/upload")
                })
            })
        } else {
            res.redirect("/signup?nameAlreadyTaken")
        }
    } else {
        res.redirect("/signup?passwordLow")
    }
})

app.get('/logout', (req, res, next) => {
    req.session.user = null
    req.session.save(function (err) {
      if (err) next(err)
      
      req.session.regenerate(function (err) {
          if (err) next(err)
        res.redirect('/')
      })
    })
})

app.get('/site/:dnsname', (req, res) => {
    var name = req.params['dnsname']
    if (!db.dnsnameIsFree(name) && db.getUserIdOfWebsite(name) == req.session.user) {
        var files = getAllFiles("./websites/" + name + "/Site", [])
        res.render("pages/edit_site", { name: name, files: files })
    } else {
        res.redirect("/")
    }
})

app.post("/site/:dnsname", (req, res) => {
    var name = req.params['dnsname']
    if (!db.dnsnameIsFree(name) && db.getUserIdOfWebsite(name) == req.session.user) {
        var path = req.body.path
        var code = req.body.code
        fse.writeFileSync("./websites/" + name + "/Site/" + path, code)
        res.sendStatus(200)
    } else {
        res.sendStatus(404)
    }
})

function returnInfo(res, status, info) {
    res.status(status).send({ status: 400, message: info })
}

app.get('*', function(req, res){
    res.redirect('/');
});

app.listen(port, () => {
    console.log("Application lancée sur le port " + port)
})
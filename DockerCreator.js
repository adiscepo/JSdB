var fse = require("fs-extra");
var Docker = require('dockerode');
var docker = new Docker();
const extract = require('decompress')
const { exec } = require("child_process");

async function createTmpDir(name, zipfile) {
  try {
    await fse.mkdir(__dirname + "/websites/" + name);
    await extract(zipfile, __dirname + "/websites/" + name + "/Site")
    console.log('Extraction complete')
  } catch (err) {
    // If an error occured during the creation of files, we delete everything
    await fse.rm(__dirname + "/websites/" + name, { recursive: true, force: true })
  }
}

async function listImages() {
  await docker.listImages({all: true}, (err, res) => {
    res.forEach(container => {
      console.log(container.RepoTags)
      return;
    });
  })
}

async function startContainer(name, fn) {
  var container
  docker.createContainer({
    Image: "httpd:2.4",
    AttachStderr: true,
    AttachStdout: true,
    AttachStdin: false,
    name: "container_" + name,
    // Bind the container with the files of the webpage
    Binds: [__dirname + '/websites/' + name + '/Site:/usr/local/apache2/htdocs/'],
  }).then(async (created_container) => {
    container = created_container
    container.start()
    await docker.getNetwork("bridge").connect({
      Container: container.id
    })
  }).then(() => {
    container.inspect((err, data) => {
      var ip = data.NetworkSettings.Networks.bridge.IPAddress
      fse.appendFileSync('hosts', ip + ' ' + name + '\n');
      exec("sudo ./refresh_dns")
      fn(err, ip, container.id)
    })
  }).catch((err) =>{ fn(err) })
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// function deployWebsite(name, zipfile, fn) {
//     createTmpDir(name, zipfile)
//     .then(async () => {await sleep(1000); startContainer(name, fn)})
// }

// DEVELOPMENT FUNCTION
function deployWebsite(name, zipfile, fn) {
  console.log("Docker processing...")
  return sleep(1500).then(() => {
    console.log("That's fine !")
    fn(undefined, "10.0.0.1")
  })
}

module.exports.deployWebsite = deployWebsite;
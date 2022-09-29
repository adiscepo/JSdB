var fse = require("fs-extra");
var Docker = require('dockerode');
var docker = new Docker();
const {v4: uuidv4} = require('uuid');
const { exec } = require("child_process");

var config = {}

config.uuid = uuidv4()
console.log(config.uuid)


async function createTmpDir() {
  await fse.mkdir("/tmp/" + config.uuid + "/");
  await fse.mkdir("/tmp/" + config.uuid + "/Site");
  await fse.copy("Site", "/tmp/"+config.uuid+"/Site/")
}

async function createDokerfile() {
  var dockerfile = await fse.createWriteStream('/tmp/' + config.uuid + '/Dockerfile');
  await dockerfile.write("FROM httpd:2.4\n")
  await dockerfile.write("COPY ./Site /usr/local/apache2/htdocs/\n")
  await dockerfile.end()
}

async function createImage() {
  await exec("docker build -t " + config.uuid + " /tmp/" + config.uuid + "/", async (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}

async function listImages() {
  await docker.listImages({all: true}, (err, res) => {
    res.forEach(container => {
      console.log(container.RepoTags)
      return;
    });
  })
}

async function startContainer() {
  exec("docker run --name container_" + config.uuid + " -dit " + config.uuid, async (error, stdout, stderr) => {
    var container = docker.getContainer("container_" + config.uuid)
    container.inspect(async (err, datas) => {
      var ip = datas.NetworkSettings.Networks.bridge.IPAddress
      console.log(ip)
      fse.appendFileSync('hosts', ip + ' salut\n');
      exec("sudo ./refresh_dns")
    })
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

createTmpDir()
.then(() => createDokerfile())
.then(() => createImage())
.then(async () => {await sleep(1000); listImages()})
.then(async () => {await sleep(1000); startContainer()})
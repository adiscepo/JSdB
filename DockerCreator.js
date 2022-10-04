var fse = require("fs-extra");
var Docker = require('dockerode');
var docker = new Docker();
const extract = require('extract-zip')
// const {v4: uuidv4} = require('uuid');
const { exec } = require("child_process");

// var config = {}

// config.uuid = uuidv4()
// console.log(config.uuid)


async function createTmpDir(name, zipfile) {
  await fse.mkdir("./websites/" + name + "/");
  await fse.mkdir("./websites/" + name + "/Site");
  try {
    await extract(zipfile, { dir: "/tmp/"+name })
    console.log('Extraction complete')
  } catch (err) {
  }
}

async function createDokerfile(name) {
  var dockerfile = await fse.createWriteStream('/tmp/' + name + '/Dockerfile');
  await dockerfile.write("FROM httpd:2.4\n")
  await dockerfile.write("COPY ./Site /usr/local/apache2/htdocs/\n")
  await dockerfile.end()
}

async function createImage(name) {
  await exec("docker build -t " + name + " /tmp/" + name + "/", async (error, stdout, stderr) => {
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

async function startContainer(name, fn) {
  exec("docker run --name container_" + name + " -dit " + name, async (error, stdout, stderr) => {
    var container = docker.getContainer("container_" + name)
    container.inspect(async (err, datas) => {
      try {
        var ip = datas.NetworkSettings.Networks.bridge.IPAddress
        console.log(ip)
        fse.appendFileSync('hosts', ip + ' ' + name + '\n');
        exec("sudo ./refresh_dns")
        fn(err, ip)
      } catch(err) {
        fn(err)
      }
    })
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// function deployWebsite(name, zipfile, fn) {
//     createTmpDir(name, zipfile)
//     .then(() => createDokerfile(name))
//     .then(() => createImage(name))
//     .then(async () => {await sleep(1000); listImages()})
//     .then(async () => {await sleep(1000); startContainer(name, fn)})
// }

function deployWebsite(name, zipfile, fn) {
  console.log("Docker processing...")
  sleep(1500).then(() => {
    console.log("That's fine !")
    fn(undefined, "10.0.0.1")
  })
}

module.exports.deployWebsite = deployWebsite;
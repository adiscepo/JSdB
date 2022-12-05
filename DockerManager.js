const Docker = require("dockerode")

class DockerManager {
    constructor() {
        this.docker = Docker()
        this.containers = {}
    }
    
    async fetchContainers() {
        var containers = await this.docker.listContainers({all: true})
        for (var i in containers) {
            this.containers[containers[i].Names[0]] = containers[i];
        }
        return this.containers
    }

    setContainer(key, val) {
        this.containers[key] = val
    }

    getContainer(id) {
        return this.docker.getContainer(id)
    }

    getContainerStatus(name) {
        return this.containers[name]
    }
}

// var dm = new DockerManager()
// dm.fetchContainers().then((res) => {
//     console.log(dm.getContainer("/condescending_merkle").State)
// })
module.exports.DockerManager = DockerManager;
const Docker = require("dockerode")

class DockerManager {
    constructor() {
        this.docker = Docker()
        this.containers = {}
    }
    
    async fetchContainers() {
        var containers = await this.docker.listContainers({all: true})
        for (var i in containers) {
            this.containers[containers[i].Id] = containers[i];
        }
        return this.containers
    }

    setContainer(key, val) {
        this.containers[key] = val
    }

    async getContainer(id) {
        return this.containers[id]
    }

    getContainers() {
        return this.containers
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
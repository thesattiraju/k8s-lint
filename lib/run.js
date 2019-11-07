"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const kubectlToolName = 'kubeval';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
function getkubectlDownloadURL() {
    switch (os.type()) {
        case 'Linux':
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz";
        case 'Darwin':
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz";
        case 'Windows_NT':
        default:
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-windows-amd64.zip";
    }
}
function downloadKubeval() {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = toolCache.find(kubectlToolName, 'latest');
        let kubectlDownloadPath = '';
        if (!cachedToolpath) {
            try {
                kubectlDownloadPath = yield toolCache.downloadTool(getkubectlDownloadURL());
                console.log("dowloaded");
                switch (os.type()) {
                    case 'Linux':
                        kubectlDownloadPath = yield toolCache.extractTar(path.join(kubectlDownloadPath, "kubeval-linux-amd64.tar.gz"));
                        break;
                    case 'Darwin':
                        kubectlDownloadPath = yield toolCache.extractTar(path.join(kubectlDownloadPath, "kubeval-darwin-amd64.tar.gz"));
                        break;
                    case 'Windows_NT':
                    default:
                        kubectlDownloadPath = yield toolCache.extractZip(kubectlDownloadPath, "kubeval-windows-amd64.zip");
                }
            }
            catch (exception) {
                throw new Error('DownloadKubectlFailed');
            }
        }
        const kubectlPath = path.join(cachedToolpath, kubectlToolName + getExecutableExtension());
        fs.chmodSync(kubectlPath, '777');
        core.addPath(kubectlDownloadPath);
        return kubectlPath;
    });
}
function kubeval() {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath;
        try {
            toolPath = yield io.which(kubectlToolName, true);
        }
        catch (ex) {
            toolPath = yield downloadKubeval();
        }
        let manifestsInput = core.getInput('manifests', { required: true });
        let manifests = manifestsInput.split('\n');
        for (let i = 0; i < manifests.length; i++) {
            const manifest = manifests[i];
            let toolRunner = new toolrunner_1.ToolRunner(toolPath, [manifest]);
            const code = yield toolRunner.exec();
            if (code != 0) {
                core.setFailed('Your manifests have some errors');
            }
        }
    });
}
kubeval().catch(core.setFailed);

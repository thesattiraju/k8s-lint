import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';
import { ToolRunner } from "@actions/exec/lib/toolrunner";
import * as exec from "@actions/exec";

const kubectlToolName = 'kubeval';

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

function getkubectlDownloadURL(): string {
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

async function downloadKubeval(): Promise<string> {
    let cachedToolpath = toolCache.find(kubectlToolName, 'latest');
    let kubectlDownloadPath = '';
    if (!cachedToolpath) {
        try {
            kubectlDownloadPath = await toolCache.downloadTool(getkubectlDownloadURL());
            console.log("dowloaded to", kubectlDownloadPath);
            await exec.exec(`ls ${path.dirname(kubectlDownloadPath)}`);
            if (os.type() !== 'Windows_NT') {
                await io.cp(kubectlDownloadPath, path.join(path.dirname(kubectlDownloadPath), 'tool.tar.gz'));
                kubectlDownloadPath = path.join(path.dirname(kubectlDownloadPath), 'tool.tar.gz');
            }
            switch (os.type()) {
                case 'Linux':
                    kubectlDownloadPath = await toolCache.extractTar(kubectlDownloadPath);
                    break;
                case 'Darwin':
                    kubectlDownloadPath = await toolCache.extractTar(kubectlDownloadPath);
                    break;
                case 'Windows_NT':
                default:
                    kubectlDownloadPath = await toolCache.extractZip(kubectlDownloadPath);
            }
        } catch (exception) {
            throw new Error('DownloadKubectlFailed');
        }
    }

    const kubectlPath = path.join(kubectlDownloadPath, kubectlToolName + getExecutableExtension());
    fs.chmodSync(kubectlPath, '777');
    core.addPath(kubectlDownloadPath);
    return kubectlPath;
}

async function kubeval() {
    let toolPath;
    try {
        toolPath = await io.which(kubectlToolName, true);
    }
    catch (ex) {
        toolPath = await downloadKubeval();
    }

    let manifestsInput = core.getInput('manifests', { required: true });
    let manifests = manifestsInput.split('\n');
    for (let i = 0; i < manifests.length; i++) {
        const manifest = manifests[i];
        let toolRunner = new ToolRunner(toolPath, [manifest]);
        const code = await toolRunner.exec();
        if (code != 0) {
            core.setFailed('Your manifests have some errors');
        }
    }
}

kubeval().catch(core.setFailed);
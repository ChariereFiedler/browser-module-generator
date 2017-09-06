#! /usr/bin/env node
var rl = require('readline');
var ncp = require('ncp').ncp;
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

function ask(question) {
  return new Promise(function(accept) {
    var r = rl.createInterface({
      input: process.stdin,
      output: process.stdout});

    r.question(question + ": ", function(answer) {
      r.close();
      accept(answer);
    });
  })

}

async function getPackageJsonData() {
  const defaultPackageJson = await syncReadFile(defaultsDir + "/package.json");
  const defaultConfig = JSON.parse(defaultPackageJson);

  function createOption(name, label, defaultValue) {
    return { name, label, defaultValue }
  }

  const packageOptions = [
    createOption("name", "Package name", ""),
    createOption("version", "Version", "1.0.0"),
    createOption("description", "Description", ""),
    createOption("main", "Main file", "src/index.js"),
    createOption("author", "Author", ""),
    createOption("license", "License", "MIT"),
  ];

  const data = {};
  for(let i = 0; i < packageOptions.length; i++){
    data[packageOptions[i].name] = await ask(packageOptions[i].label + (packageOptions[i].defaultValue && " (" + packageOptions[i].defaultValue + ")")) || packageOptions[i].defaultValue;
  }

  console.log("Here is what it looks like : \n");
  console.log(data);
  console.log("\n");

  return Object.assign({}, defaultConfig, data);
}

let templateDir = path.join(__dirname, "../template");
let defaultsDir = path.join(__dirname, "../defaults");
let currentProcessDir = process.cwd();

function syncExec(command) {
  return new Promise(function(accept, reject) {
    exec(command, function(err, stdout, stderr) {
      if(err) reject();
      accept({ stdout, stderr });
    });
  })
}

function syncNcp(source, destination) {
  return new Promise(function(accept, reject) {
    ncp(source, destination, function(err) {
      if(err) reject(err);
      accept();
    })
  })
}

function syncWriteFile(file, content) {
  return new Promise(function(accept, reject) {
    fs.writeFile(file, content, function(err) {
      if(err) reject(err);
      accept();
    })
  })
}

function syncReadFile(file) {
  return new Promise(function(accept, reject) {
    fs.readFile(file, "utf8", function(err, data) {
      if(err) reject(err);
      accept(data);
    })
  })
}

async function getRollupConfig(name) {
  let defaultFileName = name + ".js";
  let pluginFile = await ask("What's going to be the final file name ? (" + defaultFileName + ")") || defaultFileName;

  let fileName = pluginFile.substr(0, pluginFile.length - 3);

  let rollupDefaultFile = await syncReadFile(defaultsDir + "/rollup.config.js");
  let finalRollupConfig = rollupDefaultFile
    .replace(/%fileName%/g, fileName)
    .replace(/%pluginName%/g, name);

  console.log("All right");
  return finalRollupConfig;
}

async function start() {
  process.stdout.write('\033c');
  console.log("Welcome to browser-module-generator");
  console.log("Note that everything is going to be installed in this very directory");
  console.log("So please change directory if the current one is not convenient");

  const packageJsonDataObj = await getPackageJsonData();
  const rollupConfig = await getRollupConfig(packageJsonDataObj.name);
  const packageJsonData = JSON.stringify(packageJsonDataObj, null, 4);

  await syncNcp(templateDir, currentProcessDir);
  await syncWriteFile(currentProcessDir + "/package.json", packageJsonData);
  await syncWriteFile(currentProcessDir + "/rollup.config.js", rollupConfig);

  console.log("Installing...");
  await syncExec("npm install");
  console.log("All done !");
}

start();
"use strict";

const util = require('util');
var MiniTools = require('mini-tools');

var Promises = require('best-promise');

var backendEncuesta = require("./encuesta")

class AppTrac extends backendEncuesta.AppEncuesta{
}

new AppTrac().start();
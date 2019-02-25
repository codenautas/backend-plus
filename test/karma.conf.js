"use strict";
// Karma configuration

module.exports = function(config, preConfig) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha','expect'],

    // list of files / patterns to load in the browser
    files: [
      'node_modules/big.js/big.js',
      'node_modules/es6-promise/dist/es6-promise.auto.min.js',
      'node_modules/pikaday/pikaday.js',
      'node_modules/require-bro/lib/polyfills-bro.js',
      'node_modules/require-bro/lib/require-bro.js',
      'node_modules/like-ar/like-ar.js',
      'node_modules/best-globals/best-globals.js',
      'node_modules/json4all/json4all.js',
      'node_modules/js-to-html/lib/js-to-html.js',
      'node_modules/discrepances/lib/discrepances.js',
      'node_modules/ajax-best-promise/bin/ajax-best-promise.js',
      'node_modules/express-useragent/lib/express-useragent.js',
      'node_modules/esprima/dist/esprima.js',
      'node_modules/self-explain/dist/escodegen.browser.js',
      'node_modules/self-explain/lib/self-explain.js',
      'node_modules/type-store/type-store.js',
      'node_modules/express-useragent/lib/express-useragent.js',
      'for-client/my-localdb.js',
      'for-client/my-websqldb.js',
      'test/karma-test-*.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    // /* ESPERANDO QUE ARREGLEN: https://github.com/karma-runner/karma/issues/1768
    preprocessors: {
      /* 'lib/typed-controls.js': !!preConfig.singleRun?['coverage']:[] /* COMENTAR PARA VER MÁS LIMPIO EL CÓDIGO */
    },
    coverageReporter: process.env.TRAVIS||preConfig.singleRun?{
        type : 'json',
        dir : 'coverage/'
    }:{
        type: 'lcov', 
        dir: 'coverage/'
    },
    // */

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'/*, 'coverage', 'coverage-html-index'*/],


    // web server port
    port: 9875,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    // logLevel: config.LOG_INFO,
    logLevel: config.LOG_DEBUG,
    // logLevel: config.LOG_ERROR,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Firefox'/*, 'PhantomJS'*/].concat((process.env.TRAVIS?[]:['Chrome','IE'])),
    /* NO CAMBIAR MÁS BROWSERS DIRECTO DESDE ACÁ, INVOCAR DESDE LA LÍNEA DE PARÁMETROS ASÍ:
    npm run infinito -- --browsers Chrome,PhantomJS
    npm run infinito -- --browsers Chrome
    npm run infinito -- --browsers Firefox,Safari,Chrome
    npm run infinito -- --browsers Firefox,Safari,Chrome,IE,PhantomJS
    */
    
    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: !!process.env.TRAVIS || !!process.env.SINGLE_RUN || preConfig.singleRun
  });
};

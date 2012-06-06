var fs = require('fs');
var walker = require('walker');
var et = require('elementtree');
var _ = require('underscore');
var async = require('async');


var slashdot = function(s) { return s.replace(/\/|\\/g, '.').replace('.',''); };
var noop = function(){};

var reloadMaster = function(cache, cb) {
    fs.readFile(master, function(err, data) {
        if(err) {
            cb(err);
        } else {
            cache.master = data+"";
            cb();
        }
    });
};

var reloadTemplates = function(cache, cb) {
    findTemplates(function(err, templates) {
        if(err) cb(err);
        cache.templates = templates;
        cb();
    });
};

var newCache = function() {
    return { templates : [], master : null};
};

var processCache = function(cache) {
    cache.output = cache.master.replace("</body>",
            cache.templates.join("")+"</body>");
};

var parseTemplate = function(path, data, list, prefix) {
    if(!prefix) {
        var prefix = slashdot(file.split('.')[0].split(dir)[1]);
    }
    data = "<html><body>"+data+"</body></html>";
    try {
        var etree = et.parse(data);
        tpls = etree.findall('.//script');
        for(var i=0; i<tpls.length; i++) {
            var tpl = tpls[i];
            var id = tpl.attrib['id'];
            var newId = prefix + '.' + id;
            tpl.attrib['id'] = newId;
            list.push(et.tostring(tpl));
        }
    } catch(e) {
        console.log("Failed to parse template", path, e);
    }
};

var loadTemplates = function(map, cb) {
    var templates = [];
    var remap = _.map(map, function(v, k) { return [k, v]; });
    async.each(remap, function(kv, acb) {
        var prefix = kv[0], file = kv[1];
        fs.readFile(file, function(err, data) {
            if(err) {
                acb(err);
            } else {
                parseTemplate(file, data, templates, prefix);
                acb();
            }
        });
    }, cb);
};

var loadTemplatesDir = function(dir, cb) {
    var templates = [];
    var files = [];
    walker(dir).
        on('file', function(f,stat){ files.push(f); }).
        on('end', function() {
            async.forEach(files, function(file, ecb) {
                fs.readFile(file, function(err, data) {
                    if(err) {
                        ecb(err);
                    } else {
                        parseTemplate(file, data, templates, null);
                        ecb();
                    }
                });
            }, function(err) {cb(null, templates);});
        });
};



exports.flatten(master, templates, callback) {
    /* flattens a mapping of templates into a master template, callback is
     * fired with the result as a string */
};

exports.flattenDir(master, dir, callback) {
    /* flattens a mapping of templates into a master template, callback is
     * fired with the result as a string */
};


exports.watch(master, templates, callback) {
    /* watch a mapping of templates and flatten them into a master
     * template, callback will be fired with the results as a string initially
     * and every time a file changes.
     */

};
exports.watchDir(master, templates, callback) {
    /* watch a nested directory of templates and flatten them into a master
     * template, callback will be fired with the results as a string initially
     * and every time a file changes.
     */

};

exports.connectHandler = function(master, templates, watch, callback) {
    /* callback is passed a handler function which takes a request and a 
     * response and can be mapped as a resource in connect/express apps.
     * If watch is true the handler will re-compile the resource when files
     * are changed.
     */
    callback = callback ? callback : noop;
    var cache = newCache();

    var handler = function(req, res) {
        if(watch || !cache.output) {
            //we're either watching files or first-run, generate output
            try {
                processCache(cache);
            } catch(e) {
                throw e;
            }
        }
        res.send(cache.output);
    }

    if(watch) {
        var chokidar = require('chokidar');
        _.each(cache.templates, function(template) {
            chokidar.watch(template).on('change', function(){
                reloadTemplates(cache, noop);
            });
        });
        chokidar.watch(master).on('change', function(){reloadMaster(cache, noop);});

    }

    //entry point
    reloadMaster(cache, function(){reloadTemplates(function(){callback(handler)});});

    
};

exports.connectDirHandler = function(master, dir, watch, callback) {
    /* callback is passed a handler function which takes a request and a 
     * response and can be mapped as a resource in connect/express apps.
     * If watch is true the handler will re-compile the resource when files
     * are changed.
     */
    callback = callback ? callback : noop;
    var cache = newCache();

    var handler = function(req, res) {
        if(watch || !cache.output) {
            //we're either watching files or first-run, generate output
            try {
                processCache(cache);
            } catch(e) {
                throw e;
            }
        }
        res.send(cache.output);
    }

    if(watch) {
        var chokidar = require('chokidar');
        chokidar.watch(dir).on('change', function(){reloadTemplates(cache, noop);});
        chokidar.watch(master).on('change', function(){reloadMaster(cache, noop);});

    }

    //entry point
    reloadMaster(cache, function(){reloadTemplates(function(){callback(handler)});});


};

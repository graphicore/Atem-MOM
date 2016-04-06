define([
    'Atem-MOM/errors'
  , 'Atem-IO/errors'

  , 'ufojs/ufoLib/constants'
  , 'ufojs/ufoLib/UFOReader'
  , 'ufojs/ufoLib/UFOWriter'

  , 'obtain/obtain'
  , 'yaml'
  , 'path'
], function(
    errors
  , ioErrors

  , ufoConstants
  , UFOReader
  , UFOWriter

  , obtain
  , yaml
  , path
){
    var DATA_DIRNAME = ufoConstants.DATA_DIRNAME
      , FONTINFO_FILENAME = ufoConstants.FONTINFO_FILENAME
      , GROUPS_FILENAME = ufoConstants.GROUPS_FILENAME
      , MOMProjectError = errors.MOMProject
      , IONoEntryError = ioErrors.IONoEntry
      ;

    /**
     * Persistence API for a Atem-MOM/Project via an Atem-IO api.
     * I.e. read/write the file format.
     *
     * This exposes a "high level" public interface hat does not reveal whether
     * we are using a ufo structure or something else. So that the
     * Atem-MOM/Project dosen't have tp care.
     *
     * If interesting one day we can keep the api and switch the on disk format
     * or put the stuff into a database.
     *
     * Should this take care of routing IO events?
     *
     * The file format structure is based on an ufo v3 directory:
     *
     * metainfo.plist
     * fontinfo.plist
     * groups.plist
     * data/
     *     com.metapolator/
     *         project.yaml
     *         log.yaml
     *         CPS/
     *             lib/
     *                 MOM/
     *                 metapolator/
     *                 ...
     *             {mastername}.master.cps
     *         MOM/
     *             multivers.yaml // contains the data of multivers and the univers but skips the masters
     *             {base-name}.master.yaml
     *             {master-name}.master.yaml
     *             {instance-name}.master.yaml
     *
     *
     * -> This is an interesting thought:
     *     the glyphs in a master should not be stored by index but by id
     *     or: should not be indexed by position but by id
     *     AND the glyph order should be stored alphabetically
     *     so that we really can look at the essence and say if
     *     it is the same.
     *     in OMA/_Node there could be a flag for this
     *     also, this means every Node type that is indexed by
     *     id MUST have a (unique) id. There's no way to force a node to have an
     *     id at the moment. The uniqueness is no problem.
     *     Unless we just put the id in the list that has type, data
     *     then we can come around that requirement (but it's a bit pointless).
     *     Also, many dict implementations don't guarantee to keep order
     *     so a list is it probably.
     *     Maybe `idIsEssential` to change serialization
     *     And `childIdIsMandatory` to force nodes to have an id per parent type
     */
    function IOProjectPersistence(io, baseDir) {
        this._io = io;
        this.__ufoReader = null;
        this.__ufoWriter = null;
        Object.defineProperty(this, 'baseDir', {value: baseDir});
    }
    var _p = IOProjectPersistence.prototype;
    _p.constructor = IOProjectPersistence;

    Object.defineProperties(_p, {
        // some of these directories are initially empty, so we shouldn't
        // expect them to exist at all when trying to consume their contents
        // or when trying to write to them.
        dataDir:{ get: function(){ return [this.baseDir, DATA_DIRNAME, 'com.metapolator'].join('/');} }
      , projectFile: { get: function(){ return this.dataDir + '/project.yaml';} }
      , logFile: { get: function(){ return this.dataDir + '/log.yaml';} }
        // cps files are managed by rule controller?
      , cpsDir: { get: function(){ return this.dataDir + '/CPS';} }
      , momDir: { get: function(){ return this.dataDir + '/MOM';} }
      , cpsGeneratedDir: { get: function(){ return this.cpsDir + '/generated';} }
      , _ufoReader: { get: function() {
            if(!this.__ufoReader)
                throw new MOMProjectError('Not properly initialized, run "open" or "init" first.');
            return this.__ufoReader;
        }}
      , _ufoWriter: { get: function() {
            if(!this.__ufoWriter)
                throw new MOMProjectError('Not properly initialized, run "open" or "init" first.');
            return this.__ufoWriter;
        }}
    });

    _p._getUFOReader = obtain.factory(
        {
            io: [function(){ return this._io; }]
          , path: [function(){ return this.baseDir; }]
          , ufoReader:[false, 'io', 'path', UFOReader.factory]
        }
      , {
            ufoReader:[true, 'io', 'path', UFOReader.factory]
        }
      , []
      , function(obtain) { return  obtain('ufoReader'); }
    );

    _p._getUFOWriter = obtain.factory(
        {
            io: [function(){ return this._io; }]
          , path: [function(){ return this.baseDir; }]
          , ufoWriter:[false, 'io', 'path', UFOWriter.factory]
        }
      , {
            ufoWriter:[true, 'io', 'path', UFOWriter.factory]
        }
      , []
      , function(obtain) { return obtain('ufoWriter'); }
    );

    /**
     * TODO: this is very handy! Could be a helper attached to obtain itself.
     * obtain.callProxy
     * Even better, if the last argument of an obtain-getter dependecy
     * Array is not a function but an array, it is interpreted as argument
     * to callProxy.
     */
     function callProxy(callTarget /*, args , ... */) {
        /*jshint validthis:true*/
        var args = [], i, l
          , target = this[callTarget[0]]
          , method = target[callTarget[1]]
          ;
        for(i=1,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        return method.apply(target, args);
    }

    // update is updating the parts of the project
    /**
     * Create a new MP-UFO_3 and leave IOProjectPersistence in a ready state.
     */
    _p.init = obtain.factory(
        {
            baseDir: [function(){ return this.baseDir; }]
          , mkdir: [['_io', 'mkDir'], false, 'baseDir', callProxy]
          , reader: [false, _p._getUFOReader]
          , writer: [false, _p._getUFOWriter]
        }
      , {
            mkdir: [['_io', 'mkDir'], true, 'baseDir', callProxy]
          , reader: [true, _p._getUFOReader]
          , writer: [true, _p._getUFOWriter]
        }
      , []
      , function(obtain) {
            // Fails if baseDir already exists, which is good and intended!
            // UFOWriter would also create the dir but NOT fail if it existed.
            obtain('mkdir');
            // Init the basic ufo v3 structure where the mp format lives in.
            this.__ufoWriter = obtain('writer');
            this.__ufoReader = obtain('reader');
            // The project should now save project.yaml in it's init method.
        }
    );

    /**
     * Open an existing MP-UFO_3 and leave IOProjectPersistence in a ready state.
     */
    _p.open = obtain.factory(
        {
            reader: [false, _p._getUFOReader]
          , writer: [false, _p._getUFOWriter]
        }
      , {
            reader: [true, _p._getUFOReader]
          , writer: [true, _p._getUFOWriter]
        }
      , []
      , function(obtain) {
            // Will fail if baseDir is not a ufo (If metainfo.plist does not exist.)
            this.__ufoReader = obtain('reader');
            this.__ufoWriter = obtain('writer');
        }
    );

    _p._readYAMLFile = function(async, file, defaultVal) {
        var data;
        function onError(error) {
            if(error instanceof IONoEntryError && defaultVal !== undefined)
                return defaultVal;
            throw error;
        }
        function onData(data) {
            try {
                return yaml.safeLoad(data);
            }
            catch(e) {
                // Translate YAML errors
                throw new MOMProjectError('Invalid yaml file ' + e);
            }
        }
        try {
            data = this._io.readFile(false, file);
        }
        catch (error) {
            // this is for the sync execution path, the async error
            // will be handled via the promise
            return onError(error);
        }
        if(async)
            return data.then(onData, onError);
        return onData(data);
    };

    _p._writeYAMLFile = function(async, filename, obj) {
        // FIXME: safeDump could throw, make this obtain.js
        //        Maybe add some "obtain.sheath" method that adds well
        //        behaved error handling to adhoc obtain api functions
        //        like this. It sheathes the method so that thrown exceptions
        //        cannot just "come out" in async mode. A Decorator style
        //        function: obtain.sheath(function definition(args){ ... })
        var yamlStr = yaml.safeDump(obj)
          , dir = path.dirname(filename)
          , promise
          ;
        // TODO: assert(insert test here, 'path (' + path + ') must not '
        //                              + 'be above the base directory.');
        promise = this._io.ensureDirs(async, dir);
        if(async)
            return promise.then(this._io.writeFile
                              .bind(this._io, true, filename, yamlStr));
        return this._io.writeFile(false, filename, yamlStr);
    };

    _p._deleteFile = function (async, path, skipNoEntry) {
        var promise;
        function onError(error) {
            if(skipNoEntry && error instanceof IONoEntryError)
                return true;
            throw error;
        }
        try {
            promise = this._io.unlink(async, path);
        }
        catch(error) {
            return onError(error);
        }
        if(async)
            return promise.then(function(){return true;}, onError);
        return true;
    };

    _p._makeMOMDataFilename = function(basename) {
        return  [this.momDir, basename + '.yaml'].join('/');
    };

    _p._makeCPSFilename = function(filename) {
        return  [this.cpsDir, filename].join('/');
    };

    _p.readMOMData = function(async, name) {
        var path = this._makeMOMDataFilename(name);
        return this._readYAMLFile(async, path);
    };

    _p.writeMOMData = function(async, name, obj) {
        var path = this._makeMOMDataFilename(name);
        return this._writeYAMLFile(async, path, obj);
    };

    _p.deleteMOMData = function(async, name, skipNoEntry) {
        var path = this._makeMOMDataFilename(name);
        return this._deleteFile(async, path, skipNoEntry);
    };

    _p.listMOMItems = function(async) {
        var items = this._io.readDir(async, this.momDir);
        function onData(items) {
            var result = [], i, l, item, pos, suffix='.yaml';
            for(i=0,l=items.length;i<l;i++) {
                item = items[i];
                pos = item.lastIndexOf(suffix);
                if(pos === -1) continue;
                // This also allows a file that is called just '.yaml'
                // I'm not sure for what case that would be good for but
                // I think it is ok anyways.
                result.push(item.slice(0, pos));
            }
            return result;
        }
        if(async)
            return items.then(onData);
        return onData(items);
    };

    // CPS-files are read and written by RuleController.
    // New CPS-files are written via this interface (could be done via RuleController!)
    // maybe we should move the writing into here?
    // readCPSFile is never used.
    // At the moment deleteCPSFile is the only used method in Project
    // and t seems like it would be smart to move that also to RuleController.
    // Anyways, I wan't to keep the spread of the RuleController reference
    // lower than it is now. Metapolator itself should not need to talk directly
    // to ruleController.
    // see ui/metapolator/instanceTools (could be channeled via Project)
    _p.readCPSFile = function(async, name) {
        var path = this._makeCPSFilename(name);
        return this._io._readFile(async, path);
    };

    _p.writeCPSFile = function(async, name, data) {
        var path = this._makeCPSFilename(name)
          , promise = this._io.ensureDirs(async, this.cpsDir)
          ;
        if(async)
            return promise.then(this._io.writeFile
                              .bind(this._io, true, path, data));
        return this._io.writeFile(false, path, data);
    };

    _p.deleteCPSFile = function(async, filename, skipNoEntry) {
        var path = this._makeCPSFilename(filename);
        return this._deleteFile(async, path, skipNoEntry);
    };

    /**
     * Raises if projectFile can't be read (if we really have this file
     * in the end, it shouldn't be optional)
     */
    _p.readProject = function(async) {
        return this._readYAMLFile(async, this.projectFile);
    };

    _p.writeProject = function(async, data) {
        return this._writeYAMLFile(async, this.projectFile, data);
    };

    _p.readLog = function(async) {
        return this._readYAMLFile(async, this.logFile, null);
    };

    _p.appendLog = function(async, data) {
        return this._io.appendFile(async, this.logFile, data);
    };

    /**
     * Return a groups object:
     * Keys are group names and values are lists of glyph name strings
     * Returned object is empty if there was no groups file.
     */
    _p.readGroups = function(async) {
        return this._ufoReader.readGroups(async);
    };

    _p.writeGroups = function(async, data) {
        return this._ufoWriter.writeGroups(async, data);
    };

    _p.readFontInfo = function(async) {
        return this._ufoReader.readInfo(async);
    };

    _p.writeFootInfo = function(async, data) {
        return this._ufoWriter.writeInfo(async, data);
    };

    /**
     * If there is no 'targetFile' in the project but the import
     * has one, we do the import.
     *
     * If there is a 'targetFile' in the project and override is true
     * we overide by doing the import.
     * Otherwise, we skip importing the file.
     *
     * This rule may get changed in the future, but having the first
     * possible file also imported into the project is better than not
     * having it to happen.
     *
     * Also, ufoJS can't validate this file at the moment
     * however, we can try to parse it with plistlib and see if it works.
     */
    _p._importUFOData = obtain.factory(
        {
            funcNames:['type', function(type) {
                var readFuncs = {
                        fontinfo: 'readInfo'
                      , groups: 'readGroups'
                    }
                  , writeFuncs = {
                        fontinfo: 'writeInfo'
                      , groups: 'writeGroups'
                    }
                  ;
                return {
                    read: readFuncs[type]
                  , write: writeFuncs[type]
                };
            }]
          , read: ['sourceUFOReader', 'funcNames', function(sourceUFOReader, funcNames) {
                return sourceUFOReader[funcNames.read](false);
            }]
          , write: ['funcNames', 'read', function(funcNames, data) {
                return this._ufoWriter[funcNames.write](false, data);
            }]
        }
      , {
            read: ['sourceUFOReader', 'funcNames', function(sourceUFOReader, funcNames) {
                return sourceUFOReader[funcNames.read](true);
            }]
          , write: ['funcNames', 'read', function(funcNames, data) {
                return this._ufoWriter[funcNames.write](true, data);
            }]

        }
      , ['type', 'sourceUFOReader']
      , function(obtain, type) {
            obtain('read');
            this._log.debug('Importing "' + type + '" into project.');
            obtain('write');
        }
    );

    _p.importUFOData = function(async, io, sourceUFODir, override, fontinfo/*boolean*/, groups/*boolean*/) {
        var types = []
          , targets = {
                fontinfo: FONTINFO_FILENAME
              , groups: GROUPS_FILENAME
            }
          , i, l, exists, targetFile
          , data
          ;
        if(fontinfo) types.push('fontinfo');
        if(groups) types.push('groups');

        function filterIfExists(exists) {
            var i, l, result;
            for(i=0,l=exists.length;i<l;i++)
                if(!exists[i])
                    result.push(types[i]);
                else
                    this._log.debug(types[i] + ' exists in the project, skipping import.');
            return result;
        }

        if(!override) {
            exists = [];
            for(i=0,l=types.length;i<l;i++) {
                targetFile = [sourceUFODir, targets[types[i]]].join('/');
                exists.push(io.pathExists(!!async, targetFile));
            }
            if(async)
                targets = Promise.all(exists).then(filterIfExists);
            else
                targets = filterIfExists(exists);
        }

        data = [
            UFOReader.factory(async, io, sourceUFODir)
            // if this is a promise, in async, it will be resolved
            // but if this is just a value, Promise.all will call the
            // callback just with that value. Nice!
          , targets
        ];

        function onData(async, data) {
            var i, l, imports = []
              , sourceUFOReader = data[0]
              , targets = data[1]
              ;
            for(i=0,l=targets.length;i<l;i++)
                imports.push(this._importUFOData(async, sourceUFOReader, targets[i]));
            if(async)
                return Promise.all(imports);
            // else: nothing to do ...
        }

        if(async)
            return Promise.all(data)
                          .then(onData.bind(this, async));
        return onData.call(this, false, data);
    };


    return IOProjectPersistence;
});

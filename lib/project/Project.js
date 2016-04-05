define([
    'Atem-MOM/errors'
  , 'Atem-IO/errors'
  , 'obtain/obtain'

  , './IOProjectPersistence'

  , 'Atem-Logging/Logger'
  , 'Atem-Logging/Level'
  , 'Atem-Logging/ConsoleHandler'
  , 'Atem-Logging/YAMLFormatter'
  , 'Atem-Logging/CallbackHandler'
  , 'Atem-Logging/LogRecord'

  , 'Atem-CPS/CPS/RuleController'
  , 'Atem-CPS/CPS/SelectorEngine'

  , 'Atem-MOM/Controller'
  , 'Atem-MOM/cpsTools'
  , 'Atem-MOM/MOM/Multivers'
  , 'Atem-MOM/MOM/Univers'
  , 'Atem-MOM/MOM/Master'

  , 'Atem-MOM/import/UFOImporter'
  , 'Atem-MOM/export/UFOExporter'
  , 'Atem-MOM/export/OTFExporter'

  , 'Atem-IO/tools/zipUtil'
  , 'Atem-IO/io/InMemory'
  , 'Atem-IO/io/Mounting'
  , 'yaml'
  , 'ufojs/ufoLib/UFOWriter'
  , 'ufojs/ufoLib/UFOReader'


], function(
    errors
  , ioErrors
  , obtain

  , IOProjectPersistence

  , Logger
  , Level
  , ConsoleHandler
  , YAMLFormatter
  , CallbackHandler
  , LogRecord

  , RuleController
  , SelectorEngine

  , Controller
  , cpsTools
  , Multivers
  , Univers
  , Master

  , UFOImporter
  , UFOExporter
  , OTFExporter

  , zipUtil
  , InMemory
  , MountingIO
  , yaml
  , UFOWriter
  , UFOReader
) {
    "use strict";
    /*globals setTimeout*/
    var NotImplementedError = errors.NotImplemented
      , DeprecatedError = errors.Deprecated
      , IONoEntryError = ioErrors.IONoEntry
      ;

    function multiversFactory(controller) {
        return new Multivers(controller);
    }

    // High level application controller of a metapolator project
    // An additionial persistence layer should take care of reading/writing
    // stuff to disk. call it Model.js or ProjectModel or something like that
    // ProjectPersistance ...

    function Project(io, baseDir, fsEvents, cpsLibIoMounts) {
        this._persistedMasters = null;

        this._cache = {
            glyphGroups: null
          , fontInfo: null
        };

        this.baseDir = baseDir || '.';
        if(cpsLibIoMounts) {
            // I'm keeping the conditional here, so that the project can bring
            // it's own cps/lib. However, this is just a temporary backwards
            // compatibility thing. A project should rather not use the
            // cps/lib directory.
            // NOTE: the mount call completeley hides everything that would
            // be at project/data/ ... /cps/lib otherwise.
            this._io = new MountingIO(io);
            var i,l;
            for(i=0,l=cpsLibIoMounts.length;i<l;i++) {
                // no two mountpoints may be the same!
                this._io.mount(
                        // just a kind of a hard link in the second case
                        cpsLibIoMounts[i].io || io
                        // the default is lib, and a "lib/" should be the beginning
                        // of a configured mountPoint as well. Otherwise
                        // Project may start to write to the cpsLibIo
                        // (There's a write protection open to be implemented …)
                      , [this.cpsDir, cpsLibIoMounts[i].mountPoint || 'lib'].join('/')
                        // the default is ''
                      , cpsLibIoMounts[i].pathOffset
                      , cpsLibIoMounts[i].allowAboveRoot
                );
            }
        }
        else
            this._io = io;

        this._fsEvents = fsEvents;

        // FIXME: I'm suspending this for now. The reason is that we'll
        // have unintentional feedback in RuleController with this enabled
        // when having an interactive session. It's, as of now not, possible
        // to save a rule without invalidating it in the memory representation
        // save -> triggers '_fileChangeHandler' -> invalidates rules
        // We need a better way to do this, if we want to have both:
        // interactive changing AND changing from the filesystem.
        // Until then, we could make this file system monitoring optionial
        // for specific applications. It's not a high priority for now
        // but it would be easy to do. Maybe when there is an application
        // for that, like a Metapolator-Update-Monitor, that updates its
        // view when a file on disk is changed.
        // this._updateChangedRuleHandlers = null;
        // if(this._fsEvents) {
        //     this._fsEvents.on('change', this._fileChangeHandler.bind(this));
        //     // setting the defaults
        //     this.setUpdateChangedRuleHandlers();
        // }

        // This is not fully ready yet! You need to run this.init or this.load
        // to finish the initialization of this._persistence.
        this._persistence = new IOProjectPersistence(this._io, this.baseDir);

        this._selectorEngine = new SelectorEngine();
        Object.defineProperty(this, 'ruleController', {
            value: new RuleController( this._io
                                     , this._persistence.cpsDir
                                     , cpsTools.initializePropertyValue
                                     , this._selectorEngine)
        });

        this._controller = new Controller( this.ruleController
                                         , multiversFactory
                                         , this._selectorEngine);

        this._log = new Logger().setLevel(Level.DEBUG);
        this._log.addHandler(new ConsoleHandler());
    }

    var _p = Project.prototype;
    _p.constructor = Project;

    // a default baseMaster cps could be part of project
    // For now we just use {cpsLib}/MOM/primal.cps directly.
    // Can be configured later...
    Object.defineProperty(_p, 'baseMasterCPSFile', {value: 'lib/MOM/primal.cps'});


    // cps/oma controller
    Object.defineProperty(_p, 'controller', {
        get: function(){ return this._controller; }
    });

    Object.defineProperty(_p, '_univers', {
        get: function() { return this._controller.rootNode.getChild(0); }
    });

    /**
     * TODO: For the big refactoring:
     * We'll need a better strategy for events like this. A classical
     * subscription interface probably.
     *
     * This event is fired when a changed file triggered a call to
     * `this.controller.updateChangedRule` see `_p._fileChangeHandler below`
     *
     * This function is a very simple interface, to unset handlers, call it
     * without arguments. It is not possible to set multiple handlers.
     *
     */
    _p.setUpdateChangedRuleHandlers = function(callback, errback) {
        this._updateChangedRuleHandlers = [
            callback || null
          , errback || errors.unhandledPromise
        ];
    };

    _p._fileChangeHandler = function (path) {
        var match = path.indexOf(this.cpsDir)
          , sourceName
          ;
        if(match !== 0)
            return;
        // +1 to remove the leading slash
        sourceName = path.slice(this.cpsDir.length + 1);
        try {
            // FIXME: this does just: this._ruleController.reloadRule(async, ruleKey);
            // we can call it directly on ruleController and remove the updateChangedRule
            // method from this.controller
            this.controller.updateChangedRule(true, sourceName)
                .then(this._updateChangedRuleHandlers[0], this._updateChangedRuleHandlers[1]);
        }
        catch(error) {
            // KeyError will be thrown by RuleController.replaceRule if
            // sourceName is unknown, which is expected at this point,
            // because that means that sourceName is unused.
            // NOTE: the KeyError is always thrown synchronously before any io happens
            if(!(error instanceof errors.Key))
                throw error;
        }
    };

    _p._getPersistedMasters = function(async) {
        var data = this._persistence.listMOMItems(async);
        function onData(names) {
            var masterNames = [], i, l, name, pos, suffix = '.master';
            for(i=0,l=names.length;i<l;i++) {
                name = names[i];
                pos = name.lastIndexOf(suffix);
                if(pos !== -1)
                    masterNames.push(name.slice(0, pos));
            }
            return masterNames;
        }
        if(async)
            return data.then(onData);
        return onData(data);
    };

    _p._initLogging = function(logRecords) {
        // Reload any saved log entries before adding CallbackHandler for new entries
        if(logRecords) {
            logRecords.forEach(function (obj) {
                this._log.relog(LogRecord.prototype.fromObject(obj));
            }, this);
        }

        // Add CallbackHandler to log to add new entries to the log file
        var fh = new CallbackHandler();
        this._persistence.appendLog.bind(this._persistence, true);

        fh.setFormatter(new YAMLFormatter());
        this._log.addHandler(fh);
    };

    _p._getFreshProject = function() {
        return {
            session: {
                masters: []
            }
        };
    };

    /**
     * Save the project file and the multivers.
     *
     * Saves the active session. (there's no more in the project file yet)
     */
    _p._saveProject = function(async) {
        // Safe the multivers and its univers children but not the masters
        var data = this._controller.rootNode.dumpWithoutMasters();
        this._persistence.writeMOMData(async, 'multivers', data);
        this._persistence.writeProject(async, this._project);
    };

    /**
     * Use to intialize a bare, new .mp (ufo3) project dir and
     * leave MetapolatorProject in ready to use state.
     *
     * FIXME: This is a bigger problem! For these adhoc obtain.js api
     * methods we loose a lot of the semantics of the "async" argument.
     * It can be more than a boolean and contain callbacks, maybe even
     * more in the future.
     * The elsewhere conceive obtain.sheath decorator will have to take
     * care of this! This is a big problem in a lot of the code written
     * more recently.
     */
    _p.init = function(async) {
        this._log.debug('Initializing new project at ' + this.baseDir);
        this._project = this._getFreshProject();
        this._persistedMasters = [];
        if(async)
            return this._persistence.init(true)
                .then(this._saveProject.bind(this, true))
                .then(this._initLogging.bind(this))
                ;
        // sync
        this._persistence.init(false);
        // We should play a "big bang" sound each time this is executed:
        this._controller.rootNode.add(new Univers());
        this._saveProject(false);
        this._initLogging();
    };

    /**
     * Load the project file and the multivers.
     */
    _p._loadProject = function(async) {
        var data = [
                this._persistence.readProject(!!async)
              , this._persistence.readMOMData(!!async, 'multivers')
            ]
          , onData = function (data) {
                this._project = data[0];
                this._controller.rootNode.loadTree(data[1]);
            }.bind(this)
          ;

        if(async)
            return Promise.all(data).then(onData);
        return onData(data);
    };

    /**
     * Use to load an existing .mp (ufo3) project dir and
     * leave MetapolatorProject in ready to use state.
     *
     * Does not load any masters. Maybe "openSession" is what you need
     * otherwise you can open masters with "openMaster" which also recursively
     * opens all dependency master proclaimed by the opened master(s).
     */
    _p.load = function(async) {
        // the files created in _p.init need to exist
        // however, we try to load only
        // this.baseDir+'/data/com.metapolator/project.yaml' as an indicator
        this._log.debug('Loading project');

        function getData(async) {
            //jshint validthis:true
            var data = [ this._getPersistedMasters(async)
                       , this._persistence.readLog(async)
                       ];
            if(async)
                return Promise.all(data);
            return data;
        }

        function onData(data) {
            //jshint validthis:true
            this._persistedMasters = data[0];
            this._initLogging(data[1]);
        }

        if(async)
            return this._persistence.open(true)
                       .then(this._loadProject.bind(this, true))
                       .then(getData.bind(this, true))
                       .then(onData.bind(this))
                       ;
        // fail when basedir is not ufo enough
        this._persistence.open(false);
        // fail if there's no project.yaml or multivers.yaml
        this._loadProject(false);
        onData.call(this, getData.call(this, false));
    };

    /**
     * The master will be opened by openSession.
     *
     * This is a tool for user interfaces mainly.
     */
    _p.addMasterToSession = function(masterName) {
        if(this._project.session.masters.indexOf(masterName) === -1)
            this._project.session.masters.push(masterName);
    };

    /**
     * Open all masters in the session and dependencies.
     *
     * This is a tool for user interfaces mainly.
     *
     * TODO: Make named sessions! Could be a great way to work on
     * big projects. I.E. just load the "arabic" session or just load the
     * "hangul" session.
     */
    _p.openSession = function(async) {
        if(async)
            throw new NotImplementedError('openSession currently only supports '
                                                +'synchronous execution.');
        var masters = this._project.session.masters
          , i, l, result
          , loaded = []
          ;
        for(i=0,l=masters.length;i<l;i++)
            try {
                result.push(this.openMaster(async, masters[i], true));
                loaded.push(masters[i]);
            }
            catch(error) {
                if(error instanceof IONoEntryError)
                    // Tolerate if master is not available on disk.
                    this.log.info('Session contained master #' + masters[i]
                                + ' to load but it was not found on disk.');
                else
                    // Don't tolerate erroneous masters.
                    throw error;
            }
        this._project.session.masters = loaded;
        return result;
    };

    _p.saveMaster = function(async, master) {
        var cpsFile = master.getAttachment('cpsFile');
        this._persistence.writeMOMData(async, master.id + '.master'
                                                        , master.dumpTree());
        // book keeping
        if(this._persistedMasters.indexOf(master.id) === -1)
            this._persistedMasters.push(master.id);

        this.ruleController.saveRuleIfChanged(async, cpsFile);
    };

    /**
     * Save the complete state:
     * All of the MOM (multivers and masters)
     * All of CPS (all changed, mutable files)
     * The Project-file/Session (yet only explicitly opened masters)
     */
    _p.save = function(async) {
        var masters = this._univers.children
          , i, l;

        this._saveProject(async);

        // safe all open masters
        for(i=0,l=masters.length;i<l;i++)
            this.saveMaster(async, masters[i]);

        // FIXME: TODO: make write protected PropertyCollections!
        // I leave this for another iteration: Library PropertyCollections
        // should not be writable by the user/via the UI. I.e. The user
        // can't change these files, because they are authored upstream.
        // So, we shouldn't ever have to save changed PropertyCollections
        // from library directories. I'll throw an error here when trying
        // to save to one of these places, however, in the end, the error
        // should not occur, because the user is not enabled to change the
        // property collections in the first place!
        // ALSO: A nice way to throw that error would be a readOnly switch
        // for the IO-API. (Maybe a readOnly Adapter?)
        // HMM, as an additional bonbon, a change coming from IO via a
        // file system event should still be possible. Also, maybe a ui-side
        // switch for library developers ...
        // But under default circumstances, the user shouldn't be able to
        // write library files.

        // safe all dirty user-space(mutable) cps-files ()
        this.ruleController.saveChangedRules(async);
    };

    _p.hasMaster = function(masterName) {
        // It is important that the _persistedMasters list is
        // kept up to date. Not persisted and persisted masters are true
        // if they are in this._univers at the moment.
        return !!(this._univers.getById(masterName)
                    || this._persistedMasters.indexOf(masterName) !== -1);
    };

    // returns a list of master names
    Object.defineProperty(_p, 'masters', {
        get: function() {
            var names = Object.create(null), i, l
              , masters = this._univers.children
              ;
            for(i=0,l=masters.length;i<l;i++)
                names[masters[i].id] = true;

            masters = this._persistedMasters;
            for(i=0,l=masters.length;i<l;i++)
                names[masters[i]] = true;
            return Object.keys(names);
        }
    });

    /**
     * Open master and return it.
     * By default or when "openRequiredMasters" is trueish try to open all
     * dependency masters stated in the requiredMasters attachment of master.
     * Then the master should be ready for reading from its CPS after this,
     * all dependencies loaded.
     *
     * If a required masters in the dependency chain can't be opened, a
     * warning will be printed.
     *
     * To get a list of dependencies that failed to open
     * you can add a third argument 'failedMastersReturn' which should be
     * an Array and which will be filled with names of failed masters,
     * using its `push` method. Keep a reference of 'failedMastersReturn'
     * to check it after openMaster has finished.
     *
     * The reason for not throwing an error here, when a dependency can't
     * be loaded is that it may be OK not to have the dependency, depending
     * on how master is going to be used. The 'requiredMasters' attachment
     * is like a very rough recommendation, not as a hard dependency. Hard
     * dependencies are made within CPS rules, but it's also hard to track
     * them there (at the moment).
     */
    _p.openMaster = obtain.factory(
        {
            originMaster: [false, 'masterName', _p._openMaster]
          , requiredMasters: ['originMaster', 'failedMastersReturn',
            function(originMaster, failedMastersReturn) {
                var opened = new Set()
                  , requiredMasters = originMaster.getAttachment('requiredMasters') || []
                  , masterName, master
                  ;
                opened.add(originMaster.id);
                while((masterName = requiredMasters.pop())) {
                    if(opened.has(masterName))
                        continue;
                    opened.add(masterName);
                    try {
                        // open master may just get masterName from univers
                        // if it is already there
                        master = this._openMaster(false, masterName);
                    }
                    catch(error) {
                        if(failedMastersReturn) failedMastersReturn.push(masterName);
                        if(error instanceof IONoEntryError) {
                            // log, but silence the error
                            // The dependency does not originate from having
                            // a master name in the requiredMasters attachment,
                            // but from the references used in the CPS of the
                            // master. Thus, it may be totally fine and the
                            // dependency stated in requiredMasters was wrong,
                            // outdated or just not applying for what we do with
                            // the master. We don't know, but if there is a
                            // problem from this, the hint is in the logs.
                            this._log.warning('Dependency master #'
                                    + masterName + '" of #' + originMaster.id
                                    + ' does not exist on disk. ' + error);
                        }
                        else
                            // Don't accept erroneous masters.
                            throw error;
                    }
                    Array.prototype.push.apply(requiredMasters, master.getAttachment('requiredMasters') || []);
                }
            }]
        }
      , {
            originMaster: [true, 'masterName', _p._openMaster]
          , requiredMasters: ['originMaster', 'failedMastersReturn', '_callback', '_errback',
            function(originMaster, failedMastersReturn, callback, errback) {
                //jshint unused:vars
                var jobs = 0
                  , opened = new Set()
                  , onError = (function (masterName, error) {
                        // jshint validthis:true
                        jobs -= 1;
                        if(failedMastersReturn) failedMastersReturn.push(masterName);

                        if(error instanceof IONoEntryError)
                            // log, but silence the error.
                            // An explanation is in the catch of the synchronous
                            // execution path.
                            this._log.warning('Dependency master #'
                                    + masterName + '" of #' + originMaster.id
                                    + ' does not exist on disk. ' + error);
                        else
                            // Don't accept erroneous masters.
                            throw error;
                        if(jobs === 0)
                            callback(originMaster);
                    }).bind(this)
                  , onOpen = (function (master) {
                        // jshint validthis:true
                        var i, l, requiredMasters, masterName;
                        jobs -= 1;
                        requiredMasters = master.getAttachment('requiredMasters') || [];
                        for(i=0,l=requiredMasters.length;i<l;i++) {
                            masterName = requiredMasters[i];
                            if(opened.has(masterName))
                                continue;
                            opened.add(masterName);
                            jobs += 1;
                            // open master may just get masterName from univers
                            // if it is already there
                            this._openMaster(true, masterName)
                                .then(onOpen, onError.bind(null, masterName));
                        }
                        if(jobs === 0)
                            callback(originMaster);
                    }).bind(this)
                  ;
                opened.add(originMaster.id);
                // prevent callback from being called immediately if there are
                // no further dependencies.
                setTimeout(onOpen, 0, originMaster);
            }]
        }
      , ['masterName', 'openRequiredMasters', 'failedMastersReturn']
      , function(obtain, masterName, openRequiredMasters) {
            var master = obtain('originMaster');
            if(openRequiredMasters !== undefined || openRequiredMasters)
                obtain('requiredMasters');
            return master;
        }
    );

    _p.getMOMMaster = function() {
        throw new DeprecatedError('"getMOMMaster" is deprecated, use "open" instead.');
    };

    _p._cloneMaster = obtain.factory(
        {
            momMaster: ['masterName', 'sourceMOM', 'cloneArgs',
            function(masterName, sourceMOM, cloneArgs) {
                var momMaster = sourceMOM.clone.apply(sourceMOM, cloneArgs)
                  , id = this._getUniqueMasterName(masterName)
                  , cpsFile = id + '.master.cps'
                  ;
                momMaster.attachData('cpsFile', cpsFile);
                momMaster.id = id;
                return momMaster;
            }]
          , cpsFile: ['momMaster', function(momMaster) {
                            return momMaster.getAttachment('cpsFile');}]
          , sourceMOM: [false, 'sourceMasterName', _p._openMaster]
          , saveCPS: [['_persistence', 'writeCPSFile'], false, 'cpsFile', 'cpsString']
        }
      , {
            sourceMOM: [true, 'sourceMasterName', _p._openMaster]
          , saveCPS: [['_persistence', 'writeCPSFile'], true, 'cpsFile', 'cpsString']
        }
      , ['sourceMasterName', 'masterName', 'cpsString', 'cloneArgs']
      , function (obtain) {
            obtain('saveCPS');
            var momMaster = obtain('momMaster');
            this._univers.add(momMaster);
            return momMaster;
        }
    );

   /**
    * Create new "master-" and "instance-" masters etc.
    *
    * FIXME: these notations of master types should maybe not be done by
    * Metapolator. Not necessarily in here either, though.
    *
    * Setting requiredMasters should be done by the caller!
    *
    * sourceMasterName: We need an essence donor, which we clone including ids and classes
    * excluding attachments and properties
    *
    * masterName: the name of the new masters, may get altered to be unique!
    *
    * cpsString: contents of the new masters cps file
    */
    _p.createMaster = function (async, sourceMasterName, masterName, cpsString) {
        // FIXME: the glyph attachment data IS interesting here!
        // it contains data used for export! Duplication, however, is
        // not really cool.
        // AND: Is the master fontinfo also used in export (I think so!)
        // so that data is interesting here as well, but also duplication
        // is not the best approach.
        // could the exporting code be aware of the "base master" concept?
        // This should be taken care of when the planned "metacomponent"
        // changes are implemented!

        // idsAndClasses (1), properties (2), *no* attachments (4)
        var cloneArgs = [1 | 2];
        return this._cloneMaster(async, sourceMasterName, masterName
                                                 , cpsString, cloneArgs);
    };

    /**
     * Make a master by cloning and return it
     *
     * Similar as in this.import the clone is NOT saved to disk, BUT, the
     * cloned CPS file is saved to io, because of ruleController.
     *
     */
    _p.cloneMaster = obtain.factory(
        {
            cloneArgs: [function() {
                // this clone contains all:
                // idsAndClasses (1), properties (2), attachments (4)
                return [1 | 2 | 4];
            }]
          , sourceMOM: [false, 'sourceMasterName', _p._openMaster]
          , sourceCPSFile: ['sourceMOM', function(sourceMOM) {
                return sourceMOM.getAttachment('cpsFile');
            }]
          , cpsRule: [['ruleController', 'getRule'], false ,'sourceCPSFile', callProxy]
          , cpsString: ['cpsRule', function(cpsRule) {
                // serialize the loaded rule to string
                return cpsRule + '';
            }]
          , clone: [false, 'sourceMasterName', 'masterName', 'cpsString'
                                            , 'cloneArgs', _p._cloneMaster]
        }
      , {
            sourceMOM: [true, 'sourceMasterName', _p._openMaster]
          , cpsRule: [['ruleController', 'getRule'], true ,'sourceCPSFile', callProxy]
          , clone: [true, 'sourceMasterName', 'masterName', 'cpsString'
                                            , 'cloneArgs', _p._cloneMaster]
        }
      , ['sourceMasterName', 'masterName']
      , function(obtain){ return obtain('clone'); }
    );

    /**
     * Delete a master entry for this masterName.
     *
     *
     * - delete MOMData: masterName + '.master.yaml'
     * - delete CPSFile: masterName + '.master.cps';
     * - remove master from this._univers
     * - remove masterName from this._persistedMasters
     * - remove masterName from this._project.session.masters
     *
     * This does not save the session/project file.
     *
     * TODO: for metapolator, we must not forget to delete both:
     * the base-master and the ui-master.
     *
     * That's not the job of Project though.
     */
    _p.deleteMaster = function(masterName) {
        var ownCPSFile = masterName + '.master.cps'
          , ownMOMDataName = masterName + '.master'
          , momMaster = this._univers.getById(masterName)
          ;
        function filterMasterName(name){ return name !== masterName;}

        if(momMaster)
            this._univers.remove(momMaster);

        this._persistedMasters = this._persistedMasters
                                     .filter(filterMasterName);
        this._project.session.masters = this._project.session.masters
                                     .filter(filterMasterName);

        this._persistence.deleteMOMData(ownMOMDataName, true);

        // FIXME: this MUST be reflected in RuleController.
        // Probably: RuleController should perform the delete eventually.
        this._persistence.deleteCPSFile(ownCPSFile, true);
        return true;
    };

    /**
     * Load a momMaster from disk and return it.
     * Does not load dependency masters, just the simplest thing possible.
     */
    _p._openMaster = obtain.factory(
        {
            data: [['_persistence','readMOMData'], false, 'masterName', callProxy]
          , master: ['masterName', 'data', function(masterName, data) {
                var momMaster = new Master();
                momMaster.loadTree(data);
                if(momMaster.id !== masterName) {
                    // This could also be raised as an error, but I think this
                    // maybe happens when someone was hand editing the source
                    // files. So, just setting the actually used masterName
                    // as id is a nice move to handle this gracefully.
                    // Also, one could argue that the id should not be
                    // persisted in the first place, in this case, because
                    // the filename is the single source of the id ...
                    // Report if this causes trouble!
                    this._log.info('Auto corrected id. Loaded master as #' + masterName
                            + ' but it came with the id #' + momMaster.id + '.');
                    momMaster.id = masterName;
                }
                this._univers.add(momMaster);
                return momMaster;
            }]
        }
      , {
            data: [['_persistence','readMOMData'], true, 'masterName', callProxy]
        }
      , ['masterName']
      , function(obtain, masterName) {
            var momMaster = this._univers.getById(masterName);
            return momMaster || obtain('master');
        }
    );

    _p._getUniqueMasterName = function(masterName) {
        var result
          , separator = '_'
          , num , base
          , pos = masterName.lastIndexOf(separator)
          ;
        // shortcut
        if(!this.hasMaster(masterName))
            return masterName;

        if(pos !== -1) {
            num = masterName.slice(pos + 1);
            if(/^[0-9]+$/.test(num)) {
                num = parseInt(num, 10);
                base = masterName.slice(0, pos);
            }
        }
        if(base === undefined) {
            num = 0;
            base = masterName;
        }
        do {
           result = [base, num++].join(separator);
        } while(this.hasMaster(result));
        return result;
    };

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

    _p._getGlyphGroups = obtain.factory(
        {
            groups: [['_persistence', 'readGroups'], false, callProxy]
        }
      , {
            groups: [['_persistence', 'readGroups'], true, callProxy]
        }
      , []
      , function(obtain) {
            var groups = this._cache.glyphGroups;
            if(!groups)
                groups = this._cache.glyphGroups = obtain('groups');
            return groups;
        }
    );

    _p._getFontInfo = obtain.factory(
        {
            fontInfo: [['_persistence', 'readFontInfo'], false, callProxy]
        }
      , {
            fontInfo: [['_persistence', 'readFontInfo'], true, callProxy]
        }
      , []
      , function(obtain) {
            var fontInfo = this._cache.fontInfo;
            if(!fontInfo)
                fontInfo = this._cache.fontInfo = obtain('fontInfo');
            return fontInfo;
        }
    );

    // IMPORT/EXPORT //  Can there be a better place to put these?

    /**
     * It's MOM convention that masterName should be prefixed with
     * "base-" here.
     *
     * This does not persist the imported master in any way.
     * Need a project.save or so.
     *
     * We should make a way for re-imports, which we don't do at
     * the moment. But, it should be possible! I suggest to replace the
     * existing master with the new master completely.
     * ALSO, the masers that inherit/depend on this master will break then!
     *
     */
    _p.import = function(async, masterName, sourceUFODir, glyphs, io) {
        if(async)
            throw new NotImplementedError('import currently only supports '
                                                +'synchronous execution.');
        var name = this._getUniqueMasterName(masterName)
          , ufoReader = UFOReader.factory(async, io || this._io, sourceUFODir)
          , glyphGroups = this._getGlyphGroups(async)
          , options = {classes: glyphGroups}
          , importer = UFOImporter.factory(async, this._log, ufoReader, options)
          , momMaster
          ;
        momMaster = importer.doImport(async, glyphs);
        momMaster.id = name;
        momMaster.attachData('cpsFile', this.baseMasterCPSFile);// MOM/primal.cps
        this._univers.add(momMaster);
        return momMaster;
    };

    /**
     * Import UFO-data into the project UFO-3 file.
     *
     * currently: fontInfo.plist, groups.plist
     *
     * Prunes the caches of the UFO data.
     *
     * Proxies IOProjectPersistence.importUFOData, see that for method
     * argument signature.
     *
     * This data has currently only little defined use, like providing
     * default values at different occasions, groups are used to define
     * css classes for glyphs. But, it will become much more important
     * when the project grows.
     * It's likely that we'll have to improve all of this. Consider
     * this as a stub and vastly underdefined. If you need to get more
     * out of fontinfo and friends you just found yourself a really big job!
     */
     // async, io, sourceUFODir, override, fontinfo/*boolean*/, groups/*boolean*/
    _p.importUFOData = function(/* the args of IOProjectPersistence.importUFOData */) {
        var args = [], i,l;
        this._cache.glyphGroups = null;
        this._cache.fontInfo = null;
        for(i=0,l=arguments.length;i<l;i++) args.push(arguments[i]);
        return this._persistence.importUFOData.apply(this._persistence, args);
    };

    /**
     * The blob parameter must be data representing a file containing one or more
     * UFOs encoded with the following packaging scheme:
     *
     * upload.zip
     *     ├── master1.ufo.zip
     *     │    └── master1.ufo
     *     ├── master2.ufo.zip
     *     │    └── master2.ufo
     *     └── master3.ufo.zip
     *          └── master3.ufo
     */
    _p.importZippedUFOMasters = function(blob, masterNamePrefix_) {
        // The blob we got, MUST contain at least one file with the .ufo.zip suffix.
        // For now, we'll only load the first one.

        // First step is to instantiate an InMemory I/O module:
        var mem_io = new InMemory()
          , importedMasters = []
          , name, suffix
          , l, e, another_blob
          , sourceUFODir, glyphs, masterName
          , masterNamePrefix = masterNamePrefix_ || ''
          , entries, master
          ;

        // Then we unpack there the original blob:
        zipUtil.unpack(false, blob, mem_io, "");

        // We'll list all entries from the top-level dir
        entries = mem_io.readDir(false, "/");
        // And we'll look for zipped ufo files for decompression:
        for (e=0, l=entries.length; e<l; e++) {
            suffix = ".ufo.zip";
            name = entries[e];

            //if the filename ends with the .ufo.zip suffix:
            if (name.slice(-suffix.length) === suffix) {
                //Here we decompress the data of the ufo.zip file we found:
                another_blob = mem_io.readFile(false, name);
                mem_io.unlink(false, name);
                zipUtil.unpack(false, another_blob, mem_io, "/");
            }
        }

        // Now we'll list all in-memory filesystem entries again
        // looking for UFO folders which may have been extracted from
        // one of the ufo.zip files or could even be already available since the
        // decompression of the original zip container.
        entries = mem_io.readDir(false, "/");

        for (e=0, l=entries.length; e<l; e++) {
            name = entries[e];
            suffix = '.ufo/';

            // If we identify this entry as an UFO dir, then we import it:
            if (name.slice(-suffix.length) === suffix) {
                sourceUFODir = name.split("/")[0];
                glyphs = undefined;
                //FIXME: Replacing by spaces by '_' can be removed once we have proper escaping implemented.
                //       Metapolator dislikes spaces in master names as well as anything that has a meaning
                //       in a selector/cps. (.#>:(){}) etc.
                masterName = (masterNamePrefix + name).split(suffix)[0].split(' ').join('_');
                // TODO: On a memory io it's not bad at all to do sync io.
                // HOWEVER, io on this._io is also invoked by this.import
                // and that may be a blocking io backend.
                master = this.import(false, masterName, sourceUFODir, glyphs, mem_io);
                importedMasters.push(master);
                break; //here we're stopping right after finding the first ufo.zip
                       //In the future we may continue to load more instances at once
            }
        }

        return importedMasters;
    };

    // this is public, because the ui uses this to display a progress bar
    _p.getUFOExportGenerator = function (async, masterName, dirName, precision) {
        var io = new InMemory()
          , ufoExporter = this._getUFOExporter(false, io, masterName, dirName, precision)
          ;
        function onExporter(ufoExporter) {
            return [ufoExporter.exportGenerator(), io];
        }
        if(async)
            return ufoExporter.then(onExporter);
        return onExporter(ufoExporter);
    };

    _p._getUFOExporter = obtain.factory(
        {
            master:[false, 'masterName', _p.openMaster]
          , ufoWriter: [false, 'io', 'targetDirName', UFOWriter.factory]
          , ufoExporter: ['ufoWriter', 'master', 'precision',
            function(ufoWriter, master, precision) {
                return new UFOExporter(this._log, ufoWriter, master, undefined, true, precision);
            }]
        }
      , {
            master:[true, 'masterName', _p.openMaster]
          , ufoWriter: [true, 'io', 'targetDirName', UFOWriter.factory]
        }
      , ['io', 'masterName', 'targetDirName', 'precision']
      , function(obtain){return obtain('ufoExporter');}
    );

    _p._getOTFExporter = function(async, masterName, io, targetName) {
        var data = [
                  this.openMaster(async, masterName)
                , this._getFontInfo(async)
            ]
          , onData = function(data) {
                var master = data[0]
                  , fontinfo = master.getAttachment('fontinfo') || data[1]
                  ;
                return new OTFExporter(this._log, master, fontinfo, io, targetName);
            }.bind(this)
          ;

        if(async)
            return Promise.all(data).then(onData);
        return onData(data);
    };

    // this is public, because the ui uses this to display a progress bar
    _p.getOTFExportGenerator = function (async, masterName, targetName) {
        var io = new InMemory()
          , otfExporter = this._getOTFExporter(async, masterName, io, targetName)
          ;
        function onData(otfExporter) {
            return [otfExporter.exportGenerator(), io];
        }
        if(async)
            return otfExporter.then(onData);
        return onData(otfExporter);
    };

    _p.exportInstance = function(masterName, targetFileName, precision) {
        if (targetFileName.slice(-8) === '.ufo.zip') {
            var zipped = this.getZippedInstance(masterName, targetFileName.slice(0,-4), precision, 'nodebuffer');
            this._io.writeFile(false, targetFileName, zipped);
        } else if (targetFileName.slice(-4) === '.otf'){
            var otf = this.getOTFInstance(masterName);
            this._io.writeFile(false, targetFileName, otf);
        } else {
            this.exportUFOInstance(masterName, targetFileName, precision);
        }
    };

    _p.exportUFOInstance = function(async, masterName, targetFileName, precision) {
        var ufoExporter = this._getUFOExporter(false, this._io, masterName, targetFileName, precision);
        function onExporter(ufoExporter) {
            ufoExporter.doExport();
        }
        if(async)
            return ufoExporter.then(onExporter);
        return onExporter(ufoExporter);
    };

    _p.getZippedInstance = function(masterName, targetDirName, precision, dataType) {
        var mem_io = new InMemory()
          , ufoExporter = this._getUFOExporter(false, mem_io, masterName, targetDirName, precision)
          ;
        ufoExporter.doExport();
        return zipUtil.encode(false, mem_io, targetDirName, dataType);
    };

    _p.getZipFromIo = zipUtil.encode;

    _p.getOTFInstance = function(async, masterName) {
        var otfExporter = this._getOTFExporter(async, masterName);
        function onData(otfExporter) {
            return otfExporter.do_export();
        }
        if(async)
            return otfExporter.then(onData);
        return onData(otfExporter);
    };

    return Project;
});

/*



persist a MOM project on an Atem-IO api

i.e. read/write the file format

this should be a high level public interface hat does not reveal whether
we are using a ufo structure or something else.

So, maybe in a later step we can keep the api and switch the on disk format.

Should this take care of routing IO events?

does this control the serialization/deserialisation
    -> I think yes, it returns and takes MOM-Nodes



Some stuff from metapolator should be ported to the Project, or to an API
available via project. So:
the onLoad method in handleUFOimportFiles creates a UI-Master from an imported
master. Uses some project APIs for this. (ui/metapolator/master-panel/master-panel-controller.js)

The notions of base-master, instance- and master- should be managed somewhere away from the ui!
Not necessarily in project, but maybe in an extension?






file format:

UFO 3:

metainfo.plist
fontinfo.plist
groups.plist
kerning.plist
features.fea
lib.plist
layercontents.plist
glyphs

    contents.plist
    layerinfo.plist
    GLIF

images
data


What we use at the moment:


metainfo.plist
fontinfo.plist
groups.plist
data/
    com.metapolator/

        project.yaml
            // maybe "activeMasters: [name, ...]" so we don't load all at once?
            // also, if I wan't to load just one master, for an export job,
            // maybe also its dependency masters,
            // still needed? skeleton and properties file is skipped ...
            CURRENTLY:
                cpsFile: base.cps <- that information is good. Attached data?
                                  <- also attach data: dependencies
                propertiesFile: base.db <- no need for this
                skeleton: skeleton.base <- no need for this

        log.yaml
        CPS/
            lib/
                MOM/
                metapolator/
                ...
            {mastername}.cps
        MOM/
            multivers.yaml // contains the data of multivers and the univers but skips the masters
            master-{name}.yaml



        propertiesDB/
            multivers.yaml // multivers and it's universes
            master-{name}.yaml
        essencesDB/
            essences may really be nameless!? well at some poiint essences
            should be shared, still then there are compatible essences and
            identical esences.
            When I build a master, I need an essence first.
            At the moment, the separation of essence and master is probably
            causing more trouble/work than good. Especially because there's
            no ready to use concept what to do when essences and data is separated.
            THUS:
            a MOM direcory with just dumped master nodes would be just fine!
            It's the easiest thing to do an it's not making future moves more
            complicated!

        missing:
            - storing the essences!

-> this is interesting:
            - the glyphs in a master should NOT be stored by index but by id
                        or: should not be indexed by position but by id
                        AND the glyph order should be stored alphabetically
                        so that we really can look at the essence and say if
                        it is the same.
                        in OMA/_Node there should be a flag for this
                        also, this means every Node type that is indexed by
                        id MUST have a (unique) id
                        unless we just put the id in the list that has type, data
                        then we can come around that requirement. Also,
                        many dict implementation don't guarantee to keep order
                        so the latter is probably better.
                        maybe `idIsEssential`


basically what we need is CRUD for each relevant item


as interfaces for the entities there is either
    read/write: when not existing read returns a default/write creates the entity
    crud: create/read/update(call this write?)/delete

*/
define([
    'Atem-MOM/errors'
  , 'Atem-IO/errors'
  , 'ufojs/ufoLib/constants'
], function(
    errors
  , ioErrors
  , ufoConstants
){
    var DATA_DIRNAME = ufoConstants.DATA_DIRNAME
      , MOMProjectError = errors.MOMProject
      , IONoEntryError = ioErrors.IONoEntry
      ;

    function IOProjectPersistence(io) {
        this._io = io;

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
        // a default baseMaster cps could be part of project
        // For now we just use {cpsLib}/MOM/primal.cps directly.
        // Can be configured later...
      , baseMasterCPS: {value: 'MOM/primal.cps'}
    });

    // update is updating the parts of the project
    // create a new MP
    _p.createProject = function(async) {
        // FIXME: should create fail if this.baseDir already exists?
        // rather YES, because it may otherwise destroy existing data
        if(exists(this.baseDir))
           throw new MOMProjectError('Can\'t create project, the '
                        +'directory "'+this.baseDir+'" already exists.');

        //var dirs = [
        //      , [this.baseDir, ufojs.ufoLib.constants.DATA_DIRNAME, 'com.metapolator']
        //      , this.cpsDir
        //      , this.cpsDir + '/' + this.cpsGeneratedDirName
        //      , this.MOMDir
        //    ]
        //  ;


        ufoWriter = UFOWriter.factory(async, this.baseDir);
        ufoWriter.writeLayerContents(async);

        //, even if created here! Git for example
        // doesn't version empty dirs. Some of these dirs just vanish
        // if empty and pushed then cloned via git.
        // By default empty:
        //    this.dataDir (if we dump project.yaml)
        //    this.cpsDir
        //    this.cpsGeneratedDirName
        //    this.MOMDir

        // so this is pretty much useless! instead, we should do
        // this._io.ensureDirs(dir) when writing a file to one of the
        // potentially empty places.

        // todo: remove this if it is ultimately unused
        this._io.ensureDirs(false, this.dataDir);
        this._io.writeFile(false, this.projectFile, yaml.safeDump({}));
    };

    // open an existing MP
    // same as load?
    _p.openProject = function(async) {
        // ok, so at the moment we would do
        // After reading the project.yaml file
        // A) read project.yaml B) open all "project.openMasters"?
        // But that's both not the job of this Object!
        // should be done in project.
        this.project.masters.forEach(this.project.open, this.project);
        // to "open" a project. This is the closest thing I can think
        // about to do here

    };
    // what does this do?
    // init ufoReader?
    // return the multivers-data (from multivers.yaml if there or from scratch)!
    // auto load some masters? -> maybe!
    // maybe there can be a "openedMasters" list and a switch whether it should be loaded?
    // This should not do excessive loading of anything implicitly
    // maybe return the directory listing of momDir?
    // OK, I think this shouldn't create MOMNodes, nor serialize them.
    // just do the reading writing of the data. Parse/Dump the serialized
    // data is also good

    _p.writeProject = function(async){};
    // Is there a central project file?
    // do: update multivers.yaml


    _p._readYAMLFile = function(async, file, defaultVal) {
        var data;
        function onError(error) {
            if(error instanceof IONoEntryError && defaultVal)
                return defaultVal;
            throw error;
        }
        function onData(data) {
            try {
                return yaml.safeLoad(data);
            }
            catch(e) {
                // Translate YAML errors
                throw new MOMProjectError('Invalid log file ' + e);
            }
        }
        try {
            data = this._io.readFile(false, this.logFile);
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

    _p._writeYAMLFile = function(async, path, obj) {
        // FIXME: safeDump could throw, make this obtain.js
        var yaml = yaml.safeDump(obj);
        return this._io.readFile(async, path, yaml);
    };

    _p._makeMOMDataFilename = function(basename) {
        return  [this.momDir, basename+'.yaml'].join('/');
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

    _p.deleteMOMData = function(async, name){
        var path = this._makeMOMDataFilename(name);
        return this._io.unlink(async, path);
    };

    _p.readCPSFile = function(async, name) {
        var path = this._makeCPSFilename(name);
        return this._io._readFile(async, path);
    };

    _p.writeCPSFile = function(async, name, data) {
        var path = this._makeCPSFilename(name);
        return this._io.writeFile(async, path, data);
    };

    _p.deleteCPSFile = function(async, filename) {
        var path = this._makeCPSFilename(filename);
        return this._io.unlink(async, path);
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

    // CPS-files are read and written by RuleController as it looks by now.
    // maybe we should move the writing into here!
    // anyways, I wan't to keep the spread of the RuleController reference
    // lower than it is now. Metapolator itself should not need to talk directly
    // to ruleController.
    // see ui/metapolator/instanceTools

    // see
    return IOProjectPersistence;
});

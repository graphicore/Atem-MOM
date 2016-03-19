define([
    'Atem-MOM/errors'
  , 'Atem-MOM/rendering/basics'
  , 'Atem-Pen-Case/pens/OpenTypePen'
  , 'Atem-Pen-Case/pens/PointToSegmentPen'
  , 'Atem-Pen-Case/pens/BoundsPen'
  , 'opentype'
  , './MasterGlyphSet'
  , 'Atem-MOM/MOM/Glyph'
  , 'Atem-MOM/timer'
], function(
    errors
  , glyphBasics
  , OpenTypePen
  , PointToSegmentPen
  , BoundsPen
  , opentype
  , MasterGlyphSet
  , MOMGlyph
  , timer
) {
    "use strict";
    //jshint esnext:true
    var NotImplementedError = errors.NotImplemented
      , OTFont = opentype.Font
      , OTGlyph = opentype.Glyph
      , OTPath = opentype.Path
      ;

    // TOOD: add a real asynchronous execution path (obtain.js)

    function OTFExporter(io, log, master, targetName, fontinfo, precision) {
        this._io = io;
        this._master = master;
        this._targetName = targetName;
        this._precision = precision;
        this._log = log;
        this._fontInfo = fontinfo || master.getAttachment('fontinfo') || {};
    }
    var _p = OTFExporter.prototype;

    _p.otGlyphs = function(otGlyphs) {
        var fontinfo = this._fontInfo;
        return new OTFont({
            familyName: fontinfo.familyName || this._master.id,
            styleName: fontinfo.styleName || 'Regular',
            unitsPerEm: fontinfo.unitsPerEm || 1000,
            ascender: fontinfo.ascender || 800,
            descender: fontinfo.descender || -200,
            glyphs: otGlyphs
        });
    };

    _p.exportGenerator = function*(glyphNames) {
        var master = this._master
          , glyphs
          , glyph
          , i, l
          , style
          , time, one, total = 0
          , font
          , otGlyphs = []
          , drawFunc = function(async, segmentPen) {
                /*jshint validthis:true*/
                // we are going to bind the MOM glyph to `this`
                var pen;
                if(async)
                    throw new NotImplementedError('Asynchronous execution is not implemented');
                pen = new PointToSegmentPen(segmentPen);
                return glyphBasics.drawPoints ( this, pen );
            }
          , glyphSet = new MasterGlyphSet(master, drawFunc)
          ;

        if(!glyphNames)
            glyphs = master.children;
        else {
            glyphs = [];
            for(i=0,l=glyphNames.length;i<l;i++) {
                glyph = master.getById(glyphNames[i]);
                if(!glyph)
                    this._log.warning('requested glyph #'+glyphNames[i]
                                    +' not found in master, skipping.');
                else
                    glyphs.push(glyph);
            }
        }

        this._log.debug('exporting OTF ...');
        for(i=0, l=glyphs.length; i<l; i++) {
            var otPen = new OpenTypePen(new OTPath(), glyphSet)
              , bPen = new BoundsPen(glyphSet)
              , pen = new PointToSegmentPen(otPen)
              , bboxPen = new PointToSegmentPen(bPen)
              ;
            glyph = glyphs[i];
            style = glyph.getComputedStyle();
            time = timer.now();

            glyphBasics.drawPoints ( glyph, pen );
            glyphBasics.drawPoints ( glyph, bboxPen );

            var bbox = bPen.getBounds();
            if (bbox === undefined)
                bbox = [0,0,0,0];

            otGlyphs.push(new OTGlyph({
               name: glyph.id,
               unicode: glyph._ufoData.unicodes,
               xMin: bbox[0],
               yMin: bbox[1],
               xMax: bbox[2],
               yMax: bbox[3],
               advanceWidth: style.get('width', 0),
               path: otPen.getPath()
            }));

            one = timer.now() - time;
            total += one;
            this._log.debug('exported', glyph.id, 'this took', one,'ms');
            yield {'current_glyph':i, 'total_glyphs':l, 'glyph_id':glyph.id};
        }

        font = this._makeFont(otGlyphs);

        this._log.debug('finished ', i, 'glyphs in', total
            , 'ms\n\tthat\'s', total/i, 'per glyph\n\t   and'
            , (1000 * i / total)  ,' glyphs per second.'
        );
        this._io.writeFile(false, this._targetName, font.toBuffer());
    };

    _p.doExport = function(glyphNames) {
        var gen = this.exportGenerator(glyphNames);
        while(!(gen.next().done));
    };

    return OTFExporter;
});

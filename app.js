/* ASISTENCIA_QR_BUNDLED_GENERATOR */
(function(){
if(typeof window.qrcode === "function") return;
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));

window.qrcode=qrcode;
})();
/* AsistenciaQR: web estática y llamadas HTTPS a funciones de Supabase. */
const C=AQCore,esc=C.escape,$=s=>document.querySelector(s),cfg=window.ASISTENCIA_CONFIG;
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseKey),params=new URLSearchParams(location.search);
const isDemo=params.get('demo')==='1',studentToken=params.get('q');
let view='today',data={groups:[],students:[],sessions:[]},groupId='',sessionId='',report=null,query='',statusFilter='all',enrollmentFilter='all',busy=false;
let auth=null;try{auth=JSON.parse(sessionStorage.getItem('aq-auth')||'null');}catch{}
let refreshPromise=null;
let registrationReady=isDemo;
const brand=()=>'<div class="brand ufv-brand"><img src="data:image/png;base64,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T20MH6iBqAAAAAAAAD6qAQAA///s2TEBAAAAwqD1T20MH6iBqAAAAAAAAD6qAQAA///s2TEBAAAAwqD1T20MH6iBqAAAAAAAAD6qAQAA///s2TEBAAAAwqD1T20MH6iBqAAAAAAAAD6qAQAA///s0DEBAAAMAiDXP7S22AURuLb2AQAAAACAX0kGAAD//+zbMQEAAADCoPVPbQsv6IFNAQAAAAAA/FUDAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADCoPVPbQsvqIGkAAAAAAAA/qoBAAD//+zZMQEAAADC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AAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEBAAAAwqD1T20LL6iBpAAAAAAAAP6qAQAA///s2TEB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" alt="Universidad Francisco de Vitoria"><span class="product-name">AsistenciaQR</span></div>';
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4500);}
function saveAuth(a){auth=a;if(a)sessionStorage.setItem('aq-auth',JSON.stringify(a));else sessionStorage.removeItem('aq-auth');}
async function http(path,body,token){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  try{const res=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabaseKey,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:controller.signal});const json=await res.json().catch(()=>({}));if(!res.ok){if(res.status===401)throw Error('Tu sesión ha caducado o los datos de acceso no son correctos. Vuelve a entrar.');const failure=Error(json.message||json.msg||json.error_description||'No se pudo completar la operación.');failure.status=res.status;failure.code=json.code;throw failure;}return json;}catch(e){if(e.name==='AbortError')throw Error('La conexión está tardando demasiado. Comprueba internet y vuelve a intentarlo.');if(e instanceof TypeError)throw Error('No se pudo conectar. Comprueba internet y que Supabase esté activo.');throw e;}finally{clearTimeout(timer);}
}
async function accessToken(){if(!auth)throw Error('Inicia sesión como profesor.');if(auth.expires_at*1000<Date.now()+60000){if(!refreshPromise)refreshPromise=http('/auth/v1/token?grant_type=refresh_token',{refresh_token:auth.refresh_token}).then(saveAuth).finally(()=>refreshPromise=null);await refreshPromise;}return auth.access_token;}
async function admin(action,payload={}){return isDemo?demoAdmin(action,payload):http('/rest/v1/rpc/aq_admin',{action,payload},await accessToken());}
async function publicRPC(name,args){if(!configured)throw Error('El profesor todavía no ha conectado esta aplicación.');return http('/rest/v1/rpc/'+name,args);}
async function registrationStatus(){
  if(isDemo)return true;
  try{const r=await publicRPC('aq_registration_status',{});return r.version>=3&&r.mode==='full_name_browser';}
  catch(e){if(e.status===404||e.code==='PGRST202')return false;throw e;}
}
function matchingNameConflicts(students){const names=new Map();for(const s of students){const key=C.normalize(s.first)+'|'+C.normalize(s.last);names.set(key,(names.get(key)||0)+1);}return students.filter(s=>names.get(C.normalize(s.first)+'|'+C.normalize(s.last))>1);}
function download(name,text,type='text/csv;charset=utf-8'){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function demoSeed(){const names=[['Ana','García López'],['Luis','Pérez Martín'],['Lucía','Sánchez Ruiz'],['Mateo','Fernández Gil'],['Sofía','Romero Díaz'],['Hugo','Torres Vega'],['Valeria','Navarro León'],['Pablo','Moreno Sanz'],['Carla','Muñoz Soto'],['Daniel','Ortega Ríos'],['Alba','Castro Mora'],['Marcos','Molina Vidal']];const g={id:'demo-a',name:'Grupo A · Mañana',timezone:cfg.timezone,token:'demo-a',expires_at:new Date(Date.now()+86400000*7).toISOString()};const students=names.map(([first,last],i)=>({id:'d'+i,group_id:g.id,external_id:'A'+String(i+1).padStart(3,'0'),first,last,numero_matricula:[2,9].includes(i)?2:1,curso:[2,9,10].includes(i)?2:1,codigo_asignatura:'DEMO',asignatura:'Asignatura de ejemplo',code:i===0?'DEMO12345678':C.randomCode()}));const session={id:'demo-session',group_id:g.id,label:'Clase de hoy',class_date:C.dateKey(),opened_at:new Date().toISOString(),closes_at:new Date(Date.now()+600000).toISOString(),closed_at:null};return {groups:[g],students,sessions:[session],members:students.map((s,i)=>({...s,session_id:session.id,present:i<8,registered_at:i<8?new Date().toISOString():null,source:i<8?'alumno':null}))};}
function demoRead(){try{const d=JSON.parse(localStorage.getItem('aq-demo-v1'));if(d)return d;}catch{}const d=demoSeed();localStorage.setItem('aq-demo-v1',JSON.stringify(d));return d;}
function demoWrite(d){localStorage.setItem('aq-demo-v1',JSON.stringify(d));}
function demoAdmin(action,p){const d=demoRead();let out={ok:true};if(action==='dashboard')return {groups:d.groups,students:d.students.map(({code,...s})=>s),sessions:d.sessions};if(action==='report'){const s=d.sessions.find(x=>x.id===p.id);return {session:s,rows:d.members.filter(x=>x.session_id===p.id)};}
  if(action==='create_group'){if(d.groups.some(x=>C.normalize(x.name)===C.normalize(p.name)))throw Error('Ya existe un grupo con ese nombre.');d.groups.push({id:crypto.randomUUID(),name:p.name,timezone:cfg.timezone,token:crypto.randomUUID(),expires_at:new Date(Date.now()+7*86400000).toISOString()});}
  if(action==='import'){const codes=[];for(const r of p.rows){let g=d.groups.find(x=>C.normalize(x.name)===C.normalize(r.grupo));if(!g){g={id:crypto.randomUUID(),name:r.grupo,timezone:cfg.timezone,token:crypto.randomUUID(),expires_at:new Date(Date.now()+7*86400000).toISOString()};d.groups.push(g);}let s=d.students.find(x=>x.group_id===g.id&&C.normalize(x.external_id)===C.normalize(r.identificador));if(s){s.first=r.nombre;s.last=r.apellidos;Object.assign(s,Object.fromEntries(Object.entries(C.academicMeta(r)).filter(([,v])=>v!==null&&v!=='')));}else{s={id:crypto.randomUUID(),group_id:g.id,external_id:r.identificador,first:r.nombre,last:r.apellidos,...C.academicMeta(r),code:C.randomCode()};d.students.push(s);codes.push({...r,codigo:s.code});}}out={codes,count:p.rows.length};}
  if(action==='open'){for(const s of d.sessions.filter(x=>x.group_id===p.group_id&&!x.closed_at))s.closed_at=new Date().toISOString();const s={id:crypto.randomUUID(),group_id:p.group_id,label:p.label,class_date:C.dateKey(),opened_at:new Date().toISOString(),closes_at:new Date(Date.now()+p.minutes*60000).toISOString(),closed_at:null};d.sessions.unshift(s);d.members.push(...d.students.filter(x=>x.group_id===s.group_id).map(x=>({...x,session_id:s.id,present:false,registered_at:null,source:null})));out=s;}
  if(action==='close'){d.sessions.find(x=>x.id===p.id).closed_at=new Date().toISOString();}
  if(action==='correct'){const m=d.members.find(x=>x.session_id===p.session_id&&x.id===p.student_id);m.present=p.present;m.registered_at=p.present?new Date().toISOString():null;m.source='profesor';}
  if(action==='reset_code'){const s=d.students.find(x=>x.id===p.id);s.code=C.randomCode();out={code:s.code};}
  demoWrite(d);return out;
}
function active(s){return s&&!s.closed_at&&new Date(s.closes_at)>new Date();}
function time(d){return d?new Intl.DateTimeFormat('es',{hour:'2-digit',minute:'2-digit',timeZone:currentGroup()?.timezone||cfg.timezone}).format(new Date(d)):'—';}
function dateLabel(d){return new Intl.DateTimeFormat('es',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));}
function enrollmentPill(n){return '<span class="enrollment-tag '+(n>1?'repeat-enrollment':'')+'">'+esc(C.enrollmentLabel(n))+'</span>';}
function groupSubject(g){return data.students.find(s=>s.group_id===g.id&&s.asignatura)?.asignatura||'';}
function currentGroup(){return data.groups.find(g=>g.id===groupId);}
function qrURL(g){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('q',g.token);if(isDemo)u.searchParams.set('demo','1');return u.href;}
function qrSVG(url){if(typeof qrcode==='undefined')return '<p>No se pudo generar el QR. Utiliza el enlace.</p>';const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:5,margin:20,scalable:true});}
function showModal(title,html){const d=$('#modal');d.innerHTML='<div class="modalhead"><h2 id="modal-title">'+esc(title)+'</h2><button class="text" data-close aria-label="Cerrar">✕</button></div>'+html;d.querySelector('[data-close]').onclick=()=>d.close();d.showModal();}
function modalError(e){const f=$('#modal .form-error');if(f){f.innerHTML='<div class="error" role="alert">'+esc(e.message)+'</div>';}else toast(e.message);}
async function task(fn){if(busy)return;busy=true;try{await fn();}catch(e){toast(e.message);}finally{busy=false;}}
async function refresh(render=true){data=await admin('dashboard');registrationReady=await registrationStatus();if(!data.groups.some(x=>x.id===groupId))groupId=data.groups[0]?.id||'';const sessions=data.sessions.filter(x=>x.group_id===groupId);if(view==='today'||!sessions.some(x=>x.id===sessionId))sessionId=sessions[0]?.id||'';report=sessionId?await admin('report',{id:sessionId}):null;if(render)renderApp();}
function loginScreen(){const hasDemo=isDemo;$('#app').innerHTML='<div class="auth-shell"><aside class="auth-aside">'+brand()+'<div><div class="big-check">✓</div><h1>Más tiempo<br>para tu clase.</h1><p>El alumno se registra desde su móvil.<br>Tú tienes la asistencia en un solo lugar.</p></div><p class="small">Tu aula, al día.</p></aside><main class="auth-main"><div class="auth-form"><div class="eyebrow">ESPACIO DEL PROFESOR</div><h1 style="margin-top:16px">Bienvenido a tu aula</h1><p class="muted">Consulta tus grupos y la asistencia de cada clase.</p>'+(configured?'<form id="login"><div class="field"><label for="email">Correo electrónico</label><input id="email" type="email" autocomplete="username" required></div><div class="field"><label for="password">Contraseña</label><input id="password" type="password" autocomplete="current-password" required></div><div id="login-error" role="alert"></div><button class="primary full">Entrar a mi aula</button></form>':'<div class="notice"><strong>Tu aplicación está preparada.</strong><br>Conecta Supabase siguiendo la guía incluida para empezar a guardar asistencias reales.</div><a href="./GUIA-SUPABASE.html">Abrir guía de configuración →</a>')+'<div class="divider"></div><button id="demo" class="full">Probar en este navegador</button><p class="hint" style="margin-top:12px">La demostración guarda los datos solo en este navegador.</p></div></main></div>';
  $('#demo').onclick=()=>{const u=new URL(location.href);u.search='?demo=1';location.href=u;};
  if($('#login'))$('#login').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;$('#login-error').textContent='';try{const a=await http('/auth/v1/token?grant_type=password',{email:$('#email').value.trim(),password:$('#password').value});saveAuth(a);await refresh();}catch(err){$('#login-error').innerHTML='<div class="error">'+esc(err.message)+'</div>';saveAuth(null);}finally{b.disabled=false;}};
}
function renderApp(){const g=currentGroup(),s=report?.session;const rows=report?.rows||[],present=rows.filter(x=>x.present).length;const today=C.dateKey(new Date(),g?.timezone||cfg.timezone);const sessionToday=s?.class_date===today;
  $('#app').innerHTML='<div class="layout"><aside class="sidebar">'+brand()+'<nav>'+[['today','▦','Mi clase'],['groups','♧','Grupos y alumnos'],['history','◷','Historial']].map(([v,i,t])=>'<button class="navbtn '+(view===v?'active':'')+'" data-view="'+v+'"><span class="navicon" aria-hidden="true">'+i+'</span>'+t+'</button>').join('')+'</nav><div class="sidefoot"><p><span class="avatar">P</span> Mi espacio docente</p><p class="hint">'+(isDemo?'Prueba local':'Acceso privado')+'</p><button class="text" id="logout">'+(isDemo?'Salir de la demo':'Cerrar sesión')+'</button></div></aside><main class="main"><div class="topbar"><span class="date">'+esc(new Intl.DateTimeFormat('es',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:g?.timezone||cfg.timezone}).format(new Date()))+'</span><div class="toolbar"><span class="pill">'+(isDemo?'Demostración':'Profesor')+'</span><button class="text" id="refresh">↻ Actualizar</button><button class="text" id="logout-top">Salir</button></div></div>'+(isDemo?'<div class="demo-banner"><strong>Estás probando una demostración.</strong> Los datos de esta prueba se guardan solo en este navegador. El QR de esta vista no conecta distintos dispositivos. <a href="./GUIA-SUPABASE.html">Activar la aplicación real</a></div>':'')+(!isDemo&&!registrationReady?'<div class="demo-banner" role="status"><strong>Falta actualizar el registro de alumnos.</strong> Ejecuta 04-limite-navegador.sql en SQL Editor de Supabase. No se borran alumnos ni asistencias. <a href="./GUIA-SUPABASE.html">Ver instrucciones</a></div>':'')+'<div class="heading"><div><h1>'+({today:'Tu clase, al día',groups:'Grupos y alumnos',history:'Historial de asistencia'}[view])+'</h1><p class="muted">'+({today:g&&groupSubject(g)?groupSubject(g):'Abre la asistencia y deja que tus alumnos se registren.',groups:'Prepara tus listas una vez. Úsalas en cada clase.',history:'Cada sesión, con su lista de presentes y ausentes.'}[view])+'</p></div>'+(view==='groups'?'<button class="primary" id="import">＋ Importar alumnos</button>':'<div class="toolbar"><label for="group" class="small" style="margin:0">Grupo</label><select id="group" aria-label="Seleccionar grupo">'+data.groups.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===groupId?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>')+'</div><section id="content"></section></main></div>';
  const content=$('#content');if(view==='groups'){content.innerHTML=groupsHTML();bindGroups();}else if(view==='history'){content.innerHTML=historyHTML();bindHistory();}else if(!g){content.innerHTML='<div class="card empty"><strong>Tu primera clase empieza aquí</strong>Importa tus alumnos o crea un grupo para empezar.<p style="margin-top:20px"><button class="primary" id="first-group">Preparar mis grupos</button></p></div>';$('#first-group').onclick=()=>{view='groups';renderApp();};}else{content.innerHTML='<div class="stats"><div class="stat"><span class="caption">Alumnos en '+(s?'esta sesión':'el grupo')+'</span><span class="value">'+(s?rows.length:data.students.filter(x=>x.group_id===g.id).length)+'</span><span class="caption">'+esc(g.name)+'</span></div><div class="stat"><span class="caption">Presentes</span><span class="value">'+present+'</span><span class="caption">'+(s?'Registro de la sesión':'Sin clase abierta')+'</span></div><div class="stat"><span class="caption">'+(active(s)?'Pendientes':'Ausentes')+'</span><span class="value">'+(s?rows.length-present:'—')+'</span><span class="caption">'+(active(s)?'Aún pueden registrarse':'Al finalizar la sesión')+'</span></div></div><div class="workspace"><div class="card"><div class="cardhead"><div><h2>'+esc(s?.label||'Lista de clase')+'</h2><p class="hint" style="margin:6px 0 0">'+(s?esc(dateLabel(s.class_date))+' · '+(active(s)?'Abierta hasta las '+time(s.closes_at):'Registro cerrado'):'Abre una sesión para pasar lista.')+'</p></div><button id="export" '+(!s?'disabled':'')+'>↓ Exportar</button></div><div class="cardhead"><input id="search" class="search" placeholder="Buscar alumno…" aria-label="Buscar alumno" value="'+esc(query)+'"><select id="status" aria-label="Filtrar estado" style="width:auto"><option value="all">Todos</option><option value="present">Presentes</option><option value="missing">'+(active(s)?'Pendientes':'Ausentes')+'</option></select><select id="enrollment-filter" aria-label="Filtrar matrícula" style="width:auto"><option value="all">Todas las matrículas</option><option value="1">1.ª matrícula</option><option value="2">2.ª matrícula</option><option value="3plus">3.ª o posterior</option><option value="unknown">Sin dato de matrícula</option></select></div><div id="roster"></div></div><aside><div class="qrcard"><span class="pill">'+(active(s)?'Asistencia abierta':'Listo para tu clase')+'</span><h2>Escanea. Registra. Listo.</h2><p>Un QR para el grupo esta semana.<br>Una asistencia por cada clase.</p><div class="qrsurface">'+qrSVG(qrURL(g))+'</div><button class="lime" id="open">'+(active(s)?'Cerrar asistencia':'Abrir nueva clase')+'</button><button id="project">Ampliar QR</button>'+(isDemo?'<button id="try-student">Probar como alumno ↗</button>':'')+'</div><div class="session-note"><h3>Un momento para pasar lista</h3>Puedes abrir el registro durante 2, 3, 5, 10, 15 o 30 minutos. Después se cierra automáticamente.'+(!sessionToday&&s?'<p class="notice">La lista visible es de una clase anterior.</p>':'')+'</div></aside></div>';renderRoster();$('#status').value=statusFilter;$('#enrollment-filter').value=enrollmentFilter;$('#enrollment-filter').onchange=e=>{enrollmentFilter=e.target.value;renderRoster();};$('#search').oninput=e=>{query=e.target.value;renderRoster();};$('#status').onchange=e=>{statusFilter=e.target.value;renderRoster();};$('#export').onclick=exportReport;$('#open').onclick=()=>active(s)?closeSession():openSession();$('#project').onclick=projectQR;if($('#try-student'))$('#try-student').onclick=()=>window.open(qrURL(g),'_blank','noopener');}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>task(async()=>{view=b.dataset.view;await refresh();}));if($('#group'))$('#group').onchange=e=>task(async()=>{groupId=e.target.value;sessionId='';query='';await refresh();});$('#refresh').onclick=()=>task(()=>refresh());const logout=async()=>{if(!isDemo&&auth){try{await http('/auth/v1/logout',{},auth.access_token);}catch{}}saveAuth(null);location.href=location.pathname;};$('#logout').onclick=logout;$('#logout-top').onclick=logout;
}
function renderRoster(){const rows=(report?.rows||[]).filter(r=>(C.normalize(r.first+' '+r.last+' '+r.external_id).includes(C.normalize(query)))&&(statusFilter==='all'||(statusFilter==='present'?r.present:!r.present))&&(enrollmentFilter==='all'||(enrollmentFilter==='unknown'?r.numero_matricula==null:enrollmentFilter==='3plus'?r.numero_matricula>=3:r.numero_matricula===Number(enrollmentFilter))));$('#roster').innerHTML=rows.length?'<div class="tablewrap"><table><thead><tr><th>Alumno</th><th>Matrícula / curso</th><th>Estado</th><th>Hora</th><th>Corregir</th></tr></thead><tbody>'+rows.map(r=>'<tr><td class="studentname">'+esc(r.last)+', '+esc(r.first)+'<small>'+esc(r.external_id)+'</small></td><td>'+enrollmentPill(r.numero_matricula)+'<small class="course-label">'+(r.curso?'Curso '+esc(r.curso):'Curso sin dato')+'</small></td><td><span class="pill '+(r.present?'':active(report.session)?'pending':'absent')+'">'+(r.present?'Presente':active(report.session)?'Pendiente':'Ausente')+'</span></td><td class="nowrap">'+time(r.registered_at)+(r.source==='profesor'?'<span class="hint"> · manual</span>':'')+'</td><td><button class="rowbtn" data-correct="'+esc(r.student_id||r.id)+'">'+(r.present?'Marcar ausencia':'Marcar presente')+'</button></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">'+(report?'No hay alumnos que coincidan con este filtro.':'Todavía no has abierto una clase para este grupo.')+'</div>';document.querySelectorAll('[data-correct]').forEach(b=>b.onclick=()=>{const r=report.rows.find(x=>(x.student_id||x.id)===b.dataset.correct);showModal('Corregir asistencia','<p>'+esc(r.first+' '+r.last)+' quedará como <strong>'+(r.present?'ausente':'presente')+'</strong> en esta sesión.</p><div class="form-error"></div><div class="modal-actions"><button class="primary" id="confirm-correct">Guardar corrección</button></div>');$('#confirm-correct').onclick=()=>task(async()=>{await admin('correct',{session_id:sessionId,student_id:b.dataset.correct,present:!r.present});$('#modal').close();await refresh();toast('Asistencia corregida.');});});}
function exportReport(){if(!report)return;download('asistencia-'+report.session.class_date+'.csv',C.csv([['grupo','clase','fecha','identificador','nombre','apellidos','curso','codigo_asignatura','asignatura','numero_matricula','estado','hora','origen'],...report.rows.map(r=>[currentGroup()?.name,report.session.label,report.session.class_date,r.external_id,r.first,r.last,r.curso??'',r.codigo_asignatura||'',r.asignatura||'',r.numero_matricula??'',r.present?'Presente':active(report.session)?'Pendiente':'Ausente',time(r.registered_at),r.source||''])]));}
function openSession(){if(!isDemo&&!registrationReady){toast('Actualiza primero Supabase con 04-limite-navegador.sql. Tus datos se conservarán.');return;}if(!data.students.some(s=>s.group_id===groupId)){toast('Importa alumnos en este grupo antes de abrir una clase.');return;}showModal('Abrir una nueva clase','<form id="open-form"><div class="field"><label for="class-label">Nombre de la sesión</label><input id="class-label" value="Clase de '+esc(dateLabel(C.dateKey()))+'" maxlength="100" required></div><div class="field"><label for="minutes">Tiempo para registrarse</label><select id="minutes"><option value="2">2 minutos</option><option value="3" selected>3 minutos</option><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option></select></div><p class="hint">Se crea una lista independiente con los alumnos que pertenecen ahora al grupo. La sesión anterior se cerrará.</p><div class="form-error"></div><button class="primary full">Abrir asistencia</button></form>');$('#open-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await admin('open',{group_id:groupId,label:$('#class-label').value.trim(),minutes:Number($('#minutes').value)});$('#modal').close();await refresh();toast('Asistencia abierta. Ya pueden escanear el QR.');}catch(e){modalError(e);}finally{b.disabled=false;}};}
function closeSession(){showModal('Cerrar asistencia','<p>Los alumnos que no se hayan registrado quedarán como ausentes. Podrás corregirlo después.</p><button class="primary full" id="confirm-close">Cerrar esta sesión</button>');$('#confirm-close').onclick=()=>task(async()=>{await admin('close',{id:sessionId});$('#modal').close();await refresh();toast('Asistencia cerrada.');});}
function projectQR(){const g=currentGroup(),url=qrURL(g);showModal(g.name,'<div class="qr-modal"><p>Escanea para registrar tu asistencia</p><div class="qr-large">'+qrSVG(url)+'</div><p class="hint">QR válido hasta '+esc(new Date(g.expires_at).toLocaleDateString('es'))+'. El profesor debe abrir la clase.</p><div class="linkbox">'+esc(url)+'</div><div class="toolbar" style="justify-content:center"><button id="copy-link">Copiar enlace</button><button id="download-qr">Descargar QR</button></div>'+(isDemo?'<div class="notice">Demo: prueba el enlace en este mismo navegador. Prueba con <strong>Ana García López</strong>.</div>':'')+'</div>');$('#copy-link').onclick=()=>task(async()=>{await navigator.clipboard.writeText(url);toast('Enlace copiado.');});$('#download-qr').onclick=()=>download('qr-grupo.svg',qrSVG(url),'image/svg+xml');}
function groupsHTML(){return '<div class="toolbar" style="margin-bottom:24px"><button id="new-group">＋ Crear grupo</button><a href="./plantilla-alumnos.csv" download>Descargar plantilla CSV</a></div><div class="group-grid">'+data.groups.map(g=>'<article class="card"><div class="cardbody"><span class="eyebrow">GRUPO</span><h2 style="margin:12px 0">'+esc(g.name)+'</h2><p class="muted subject-caption">'+esc(groupSubject(g))+'</p><p class="muted">'+data.students.filter(s=>s.group_id===g.id).length+' alumnos · '+data.students.filter(s=>s.group_id===g.id&&s.numero_matricula===2).length+' en 2.ª matrícula</p><button data-students="'+esc(g.id)+'">Ver alumnos</button></div></article>').join('')+'</div>'+(!data.groups.length?'<div class="card empty"><strong>Prepara tu primer grupo</strong>Importa un CSV. Los grupos se crearán automáticamente a partir de la columna «grupo».</div>':'');}
function bindGroups(){$('#import').onclick=importDialog;$('#new-group').onclick=()=>{showModal('Crear grupo','<form id="new-group-form"><div class="field"><label for="group-name">Nombre del grupo</label><input id="group-name" placeholder="Ej. 1.º B · Matemáticas" maxlength="100" required></div><div class="form-error"></div><button class="primary full">Crear grupo</button></form>');$('#new-group-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await admin('create_group',{name:$('#group-name').value.trim(),timezone:cfg.timezone});$('#modal').close();await refresh();}catch(e){modalError(e);}finally{b.disabled=false;}};};document.querySelectorAll('[data-students]').forEach(b=>b.onclick=()=>studentList(b.dataset.students));}
function studentList(id){const g=data.groups.find(x=>x.id===id),students=data.students.filter(x=>x.group_id===id),conflicts=matchingNameConflicts(students);showModal(g.name,(conflicts.length?'<div class="notice"><strong>'+conflicts.length+' alumnos comparten un nombre completo con otro registro.</strong> Revisa sus identificadores en la lista. Para evitar asignaciones incorrectas, registra su asistencia manualmente. No se fusionarán ni borrarán registros.</div>':'')+'<p class="hint">Los alumnos se registran con su nombre y todos sus apellidos. Si hay nombres completos repetidos, registra su asistencia manualmente desde Mi clase.</p><div class="tablewrap"><table><thead><tr><th>Alumno</th><th>Matrícula / curso</th></tr></thead><tbody>'+students.map(s=>'<tr><td>'+esc(s.first+' '+s.last)+'<br><span class="hint">'+esc(s.external_id)+'</span></td><td>'+enrollmentPill(s.numero_matricula)+'<small class="course-label">'+(s.curso?'Curso '+esc(s.curso):'Curso sin dato')+'</small></td></tr>').join('')+'</tbody></table></div>');}

function importDialog(){let importedRows=[];showModal('Importar alumnos','<form id="import-form"><p>Selecciona un CSV con las columnas <strong>identificador, nombre, apellidos y grupo</strong>.</p><p class="hint">También se conservan <strong>curso, codigo_asignatura, asignatura y numero_matricula</strong>. Curso y número de matrícula son datos diferentes. La matrícula no cambia la obligación de asistencia.</p><p class="hint">Puedes usar comas o punto y coma. Para alumnos existentes se actualizan sus datos. Para cambiar un alumno de grupo, importa su nueva matrícula: la anterior se conserva para no modificar historiales.</p><div class="field"><label for="csv-file">Archivo de alumnos</label><input id="csv-file" type="file" accept=".csv,text/csv" required></div><div id="csv-preview"></div><div class="form-error"></div><button class="primary full" id="do-import" disabled>Importar alumnos</button></form>');$('#csv-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>1000000)throw Error('El archivo debe ser menor de 1 MB.');importedRows=C.parseCSV(await f.text());$('#csv-preview').innerHTML='<div class="notice">'+importedRows.length+' alumnos · '+new Set(importedRows.map(x=>x.grupo)).size+' grupos · '+importedRows.filter(x=>x.numero_matricula===2).length+' en 2.ª matrícula<br>Primera fila: '+esc(importedRows[0].nombre+' '+importedRows[0].apellidos)+'</div>';$('#do-import').disabled=false;$('#modal .form-error').textContent='';}catch(e){$('#do-import').disabled=true;modalError(e);}};$('#import-form').onsubmit=async e=>{e.preventDefault();$('#do-import').disabled=true;try{const result=await admin('import',{rows:importedRows,timezone:cfg.timezone});$('#modal').close();await refresh();showModal('Alumnos importados','<p>Se han procesado '+result.count+' alumnos.</p><div class="notice">Ya puedes abrir una nueva clase. Los alumnos solo necesitan su nombre y todos sus apellidos para registrar la asistencia.</div>');}catch(e){modalError(e);if($('#do-import'))$('#do-import').disabled=false;}};}
function historyHTML(){return '<div class="toolbar history-filters"><label for="history-date" style="margin:0">Filtrar por fecha</label><input id="history-date" type="date"><button id="clear-date">Ver todas</button><span class="hint">Últimas 300 sesiones. Usa una fecha para consultar anteriores.</span></div><div class="card" id="history-list"></div><div id="history-report" style="margin-top:24px"></div>';}
function bindHistory(){const list=()=>{const date=$('#history-date').value;const sessions=data.sessions.filter(s=>s.group_id===groupId&&(!date||s.class_date===date));$('#history-list').innerHTML=sessions.length?sessions.map(s=>'<div class="session-item"><div><h3>'+esc(s.label)+'</h3><span class="muted small">'+esc(dateLabel(s.class_date))+' · '+time(s.opened_at)+'</span></div><div class="toolbar"><span class="pill '+(active(s)?'':'pending')+'">'+(active(s)?'Abierta':'Cerrada')+'</span><button data-report="'+esc(s.id)+'">Ver lista</button></div></div>').join(''):'<div class="empty">No hay sesiones para esta selección.</div>';document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>task(async()=>{sessionId=b.dataset.report;report=await admin('report',{id:sessionId});$('#history-report').innerHTML='<div class="card"><div class="cardhead"><h2>'+esc(report.session.label)+'</h2><div class="toolbar"><select id="history-enrollment" aria-label="Filtrar matrícula en historial"><option value="all">Todas las matrículas</option><option value="1">1.ª matrícula</option><option value="2">2.ª matrícula</option><option value="3plus">3.ª o posterior</option><option value="unknown">Sin dato de matrícula</option></select><button id="export-history">↓ Exportar CSV</button></div></div><div id="roster"></div></div>';query='';statusFilter='all';enrollmentFilter='all';renderRoster();$('#export-history').onclick=exportReport;$('#history-enrollment').onchange=e=>{enrollmentFilter=e.target.value;renderRoster();};}));};list();$('#history-date').onchange=()=>task(async()=>{const date=$('#history-date').value;if(date){const r=await admin('sessions_date',{group_id:groupId,date});if(!isDemo)data.sessions=[...data.sessions.filter(s=>!(s.group_id===groupId&&s.class_date===date)),...r];}list();$('#history-report').innerHTML='';});$('#clear-date').onclick=()=>{$('#history-date').value='';list();};}
function browserIdentity(){
 try{let id=localStorage.getItem('aq-browser-v1');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'')){id=crypto.randomUUID();localStorage.setItem('aq-browser-v1',id);}if(localStorage.getItem('aq-browser-v1')!==id)throw Error();return id;}
 catch{throw Error('Este navegador no permite guardar el registro local. Utiliza el navegador habitual o pide al profesor que registre tu asistencia.');}
}
function browserReceiptKey(session){return 'aq-browser-receipt:'+(isDemo?'demo:':'real:')+session;}
async function studentScreen(){const shell=html=>{$('#app').innerHTML='<main class="student-shell">'+brand()+'<section class="student-card">'+html+'</section><p class="footer-note">'+(isDemo?'Demostración · Los datos solo se guardan en este navegador.':'Si tienes algún problema, avisa a tu profesor.')+'</p></main>';};shell('<p class="muted">Comprobando la clase…</p>');try{if(!await registrationStatus()){shell('<h1>El registro aún no está disponible</h1><div class="notice">El profesor debe actualizar la aplicación antes de registrar asistencias. No es un problema con tu nombre o tus apellidos. Avísale para que registre tu asistencia.</div><button class="primary full" id="retry">Volver a comprobar</button>');$('#retry').onclick=studentScreen;return;}let portal;if(isDemo){const d=demoRead(),g=d.groups.find(x=>x.token===studentToken);const s=d.sessions.find(x=>x.group_id===g?.id&&active(x));portal={ok:!!g,group:g?.name,session_id:s?.id,open:!!s,label:s?.label,closes_at:s?.closes_at,subject:d.students.find(x=>x.group_id===g?.id&&x.asignatura)?.asignatura};}else portal=await publicRPC('aq_portal',{p_token:studentToken});if(!portal.ok){shell('<h1>Este QR ha caducado</h1><p class="muted">Pide al profesor el código de esta semana.</p>');return;}if(!portal.open){shell('<span class="pill pending">Registro cerrado</span><h1>'+esc(portal.group)+'</h1><p class="muted">El profesor debe abrir la asistencia antes de que puedas registrarte.</p><button class="primary full" id="retry">Volver a comprobar</button>');$('#retry').onclick=studentScreen;return;}
  const browserId=browserIdentity(),receiptKey=browserReceiptKey(portal.session_id);
  const locked=()=>shell('<div class="center"><div class="success-icon">✓</div><h1>Este navegador ya se ha utilizado</h1><p class="muted">'+esc(portal.group)+'<br>'+esc(portal.label)+'</p><div class="notice">Solo puedes registrar a un alumno por navegador en esta clase. Si necesitas corregir un dato o compartir el móvil, avisa al profesor.</div></div>');
  if(localStorage.getItem(receiptKey)){locked();return;}
  shell('<span class="pill">Asistencia abierta</span><h1>'+esc(portal.group)+'</h1>'+(portal.subject?'<p class="subject-caption muted">'+esc(portal.subject)+'</p>':'')+'<p class="muted">'+esc(portal.label)+'</p>'+(isDemo?'<div class="notice">Prueba con Ana · García López</div>':'')+'<form id="checkin"><div class="notice" id="full-name-note"><strong>Introduce tu nombre completo y todos tus apellidos.</strong><br>Escríbelos tal como aparecen en la lista del profesor para que podamos identificarte correctamente. Incluye todos los nombres si tu nombre es compuesto. No necesitas código personal.<br><strong>Solo se permite un alumno por navegador y clase.</strong> Revisa los datos antes de enviar.</div><div class="field"><label for="first">Nombre completo</label><input id="first" autocomplete="given-name" aria-describedby="full-name-note" placeholder="Ej.: María del Carmen" maxlength="100" required></div><div class="field"><label for="last">Todos tus apellidos</label><input id="last" autocomplete="family-name" aria-describedby="full-name-note" placeholder="Ej.: García de la Cruz" maxlength="100" required></div><div id="checkin-error" role="alert"></div><button class="primary full">Registrar asistencia</button><p class="hint" style="margin-top:16px">Tus datos se usan para registrar la asistencia de esta clase. Solo el profesor puede consultar el listado.</p></form>');$('#checkin').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;b.textContent='Guardando…';$('#checkin-error').textContent='';try{if(localStorage.getItem(receiptKey)){locked();return;}if(!C.normalize($('#first').value)||!C.normalize($('#last').value))throw Error('Completa tu nombre y todos tus apellidos antes de registrar la asistencia.');const p={p_token:studentToken,p_first:$('#first').value.trim(),p_last:$('#last').value.trim(),p_browser:browserId,p_session:portal.session_id};let result;if(isDemo){const d=demoRead(),g=d.groups.find(x=>x.token===studentToken),s=d.sessions.find(x=>x.group_id===g?.id&&active(x));if(!s||s.id!==p.p_session)result={ok:false,message:'La asistencia ya está cerrada o ha cambiado.'};else{d.browserClaims=d.browserClaims||{};const claimKey=s.id+':'+browserId,claimed=d.browserClaims[claimKey];const matches=d.members.filter(x=>x.session_id===s.id&&C.normalize(x.first)===C.normalize(p.p_first)&&C.normalize(x.last)===C.normalize(p.p_last));const m=matches.length===1?matches[0]:null;if(claimed&&(!m||claimed!==m.id))result={ok:false,browser_used:true,message:'Este navegador ya se utilizó para registrar a otro alumno en esta clase.'};else if(matches.length>1)result={ok:false,message:'Hay más de un alumno con ese nombre completo. Pide al profesor que registre tu asistencia.'};else if(!m)result={ok:false,message:'Escribe tu nombre y todos tus apellidos tal como figuran en la lista del profesor.'};else if(!m.present&&m.source==='profesor')result={ok:false,message:'Tu profesor ha revisado esta asistencia. Consulta con él.'};else{result={ok:true,duplicate:m.present};m.present=true;m.registered_at=m.registered_at||new Date().toISOString();m.source=m.source||'alumno';d.browserClaims[claimKey]=m.id;demoWrite(d);}}}else result=await publicRPC('aq_checkin_browser',p);if(result.browser_used){try{localStorage.setItem(receiptKey,'used');}catch{/* La comprobación del servidor sigue activa. */}locked();return;}if(!result.ok)throw Error(result.message);try{localStorage.setItem(receiptKey,'used');}catch{/* La comprobación del servidor sigue activa. */}shell('<div class="center"><div class="success-icon">✓</div><h1>'+(result.duplicate?'Ya estabas en la lista':'Tu asistencia ha quedado registrada')+'</h1><p class="muted">'+esc(portal.group)+'<br>'+esc(portal.label)+'</p><div class="notice">'+(isDemo?'Registro de demostración guardado en este navegador.':'Puedes cerrar esta página. Este navegador queda reservado a tu registro durante esta clase.')+'</div></div>');}catch(err){$('#checkin-error').innerHTML='<div class="error">'+esc(err.message)+'</div>';b.disabled=false;b.textContent='Registrar asistencia';}};
}catch(e){shell('<h1>No podemos abrir la clase</h1><div class="error">'+esc(e.message)+'</div><button class="primary full" id="retry">Reintentar</button>');$('#retry').onclick=studentScreen;}}
async function boot(){if(configured&&(cfg.supabaseKey.startsWith('sb_secret_')||(()=>{try{return JSON.parse(atob(cfg.supabaseKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role';}catch{return false;}})())){$('#app').innerHTML='<div class="error">Configuración incorrecta: retira la clave secreta de config.js y revócala en Supabase si la has publicado. Usa una clave publicable.</div>';return;}if(studentToken){await studentScreen();return;}if(isDemo||configured&&auth){try{await refresh();}catch(e){saveAuth(null);loginScreen();toast(e.message);}}else loginScreen();}
window.addEventListener('storage',e=>{if(isDemo&&!studentToken&&e.key==='aq-demo-v1')task(()=>refresh());});
setInterval(()=>{if(!studentToken&&(isDemo||auth)&&!busy&&!$('#modal').open&&document.visibilityState==='visible'&&view==='today')task(()=>refresh());},20000);
boot();

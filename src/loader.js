import loaderUtils from 'loader-utils';
import util from 'util';
import traverse from './traverse';
import VirtualModulePlugin from './VirtualModulePlugin';

const debug = util.debuglog('astroturf:loader');

// can'ts use class syntax b/c babel doesn't transpile it correctly for Error
function AstroTurfLoaderError(error) {
  Error.call(this);
  this.name = 'AstroTurfLoaderError';

  this.message = error.message;
  if (error.codeFrame) this.message += `\n\n ${error.codeFrame} \n`;

  this.error = error;
  try {
    this.stack = error.stack.replace(/^(.*?):/, `${this.name}:`);
  } catch (err) {
    Error.captureStackTrace(this, AstroTurfLoaderError);
  }
}

AstroTurfLoaderError.prototype = Object.create(Error.prototype);
AstroTurfLoaderError.prototype.constructor = AstroTurfLoaderError;

function collectStyles(src, filename, opts) {
  const tagName = opts.tagName || 'css';
  const styledTag = opts.styledTag || 'styled';
  // quick regex as an optimization to avoid parsing each file
  if (
    !src.match(
      new RegExp(`(${tagName}|${styledTag}.+?)\\s*\`([\\s\\S]*?)\``, 'gmi'),
    )
  ) {
    return { styles: [] };
  }

  // maybe eventually return the ast directly if babel-loader supports it
  try {
    const { metadata } = traverse(src, filename, {
      ...opts,
      writeFiles: false,
      generateInterpolations: true,
    });
    return metadata.astroturf;
  } catch (err) {
    throw new AstroTurfLoaderError(err);
  }
}

function replaceStyleTemplates(src, locations) {
  let offset = 0;

  function splice(str, start, end, replace) {
    const result =
      str.slice(0, start + offset) + replace + str.slice(end + offset);

    offset += replace.length - (end - start);
    return result;
  }

  locations.forEach(({ start, end, code }) => {
    if (code.endsWith(';')) code = code.slice(0, -1); // remove trailing semicolon
    src = splice(src, start, end, code);
  });

  return src;
}

const LOADER_PLUGIN = Symbol('loader added VM plugin');

module.exports = function loader(content) {
  if (this.cacheable) this.cacheable();

  const options = loaderUtils.getOptions(this) || {};
  const { styles = [], imports } = collectStyles(
    content,
    this.resourcePath,
    options,
  );

  if (!styles.length) return content;

  let { emitVirtualFile } = this;

  // The plugin isn't loaded
  if (!emitVirtualFile) {
    const { compiler } = this._compilation; // eslint-disable-line no-underscore-dangle
    let plugin = compiler[LOADER_PLUGIN];
    if (!plugin) {
      debug('adding plugin to compiiler');
      plugin = VirtualModulePlugin.bootstrap(this._compilation);
      compiler[LOADER_PLUGIN] = plugin;
    }
    emitVirtualFile = plugin.addFile;
  }

  styles.forEach(style => {
    emitVirtualFile(style.absoluteFilePath, style.value);
  });

  return replaceStyleTemplates(content, [...imports, ...styles]);
};

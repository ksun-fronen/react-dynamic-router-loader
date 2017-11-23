// 动态加载Component
var loaderUtils = require('loader-utils');
var path = require('path');
var fs = require('fs');
var cacheComponent = {};

function processPreRender(content, isDevare = false) {
    if (content.indexOf('preRender') >= 0) {
        var preRenderReg = /(function){0,1}\s*preRender\s*(\(\))?[^{]*{((({[^}]*})*[^}])*)}/;
        var result = preRenderReg.exec(content) || [];
        if (isDevare) {
            content = content.replace(preRenderReg, '');
        }

        return {
            content,
            preRenderCode: result[3] || ''
        };
    }

    return {
        content,
        preRenderCode: ''
    };
}

module.exports = function (content) {
    var options = loaderUtils.getOptions(this) || {};
    var optionsContext = this.options.context;
    var extensions = (this.options.resolve || {}).extensions || ['.js', '.jsx', '.ts'];
    var resourcePath = this.context;
    var rootPath = this.resourcePath;
    var aliasList = (this.options.resolve || {}).alias || {};
    var currentPreRenderModel = processPreRender(content, true);
    var replaceRegComponent = /component\s*=\s*\{(require|import)\(\s*(\/\*[^(\*\/)]*\*\/[^(\*\/)]\s*)*[\'\"]([^'")]*)[\'\"]\s*\);*\}/ig;
    var replaceRegRequire = /(require|import)\(\s*(\/\*[^(\*\/)]*\*\/[^(\*\/)]\s*)*[\'\"]([^'")]*)[\'\"]\s*\);*/;
    var data = (content.match(replaceRegComponent) || []);
    var moduleName = (options.asyncDefaultComponent && path.join(optionsContext, options.asyncDefaultComponent).replace(/\\/ig, '/') || path.join(__dirname, './asyncComponent.jsx').replace(/\\/ig, '/'));

    if (!options.asyncDefaultComponent) {
        this.emitError('please set current loader param: options -> { asyncDefaultComponent: "loading component path[base path = webpack.config -> context]" }');
        return content;
    }

    //载入异步的Component, 由于会在每一个模块都加载进来，因为渣渣作者的webpack经验尚浅。
    //暂且不做性能优化（因为Tree-Shaking的缘故会把多余的require全部去掉），所以此处所消耗的是打包效率而不是最终执行效率！！
    if (data.length >= 0) {
        content = `${content};require('${moduleName}')`;
    }

    //缓存loading 界面与对应的逻辑
    cacheComponent[rootPath] = currentPreRenderModel;
    for (var i = 0, length = data.length; i < length; i++) {
        var temp = data[i] || '';
        var componentPropString = data[i];
        var requireString = (temp.match(replaceRegRequire) || [])[0];
        var loadContent = '';
        var contentRequireModule = requireString.replace(replaceRegRequire, '$3');

        temp = contentRequireModule;

        if (!temp) {
            continue;
        }


        Object.keys(aliasList).forEach(function (key) {
            var replacePath = aliasList[key];
            var aliasName = key;
            if (key && key[key.length - 1] === '$' && key == temp) {
                temp = `node_modules/${temp}/index.js`;
            } else if (key && temp.substr(0, key.length) === key) {
                temp = replacePath + temp.substr(key.length, temp.length);
            }
        });

        //是否携带盘符指定的绝对地址
        var absPath = temp[1] == ':' ? temp : path.join(resourcePath, temp);
        //检测后缀名
        if (absPath.indexOf('.') <= 0) {
            var extension = extensions.filter(function (x) { return fs.existsSync(`${absPath}.${x}`); })[0];
            if (!extension) {
                this.emitError('webpack config -> resolve -> extensions is (.xx) not have file, please check or add your file extension');
                return content;
            }
            absPath = `${absPath}.${extension}`;
        }

        try {
            loadContent = fs.readFileSync(absPath).toString();
        } catch (ex) {
            loadContent = '';
        }

        var preRenderCode = (cacheComponent[absPath] && cacheComponent[absPath].preRenderCode) || processPreRender(loadContent).preRenderCode;

        //替换为webpack2 的 import 变为动态载入
        var importString = requireString.replace('require', 'import');
        content = content.replace(requireString, `require('${moduleName}')(() => ${importString},() => { ${preRenderCode} }, (__webpack_modules__[require.resolveWeak('${contentRequireModule}')] && __webpack_require__(require.resolveWeak('${contentRequireModule}'))) )`)
    }
    return content;
};
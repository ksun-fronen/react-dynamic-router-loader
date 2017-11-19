// 动态加载Component
let loaderUtils = require('loader-utils');
let path = require('path');
let fs = require('fs');
let _isFirst = true;
let cacheComponent = {};

function processPreRender(content, isDelete = false) {
    if (content.indexOf('preRender') >= 0) {
        let preRenderReg = /(function){0,1}\s*preRender\s*(\(\))?[^{]*{((({[^}]*})*[^}])*)}/;
        let result = preRenderReg.exec(content) || [];
        if (isDelete) {
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
    //if (_isFirst) {
    //    _isFirst = false;
    //    console.log(this);
    //}
    let options = loaderUtils.getOptions(this) || {};
    let optionsContext = this.options.context;
    let extensions = (this.options.resolve || {}).extensions || ['.js', '.jsx', '.ts'];
    let resourcePath = this.context;
    let rootPath = this.resourcePath;
    let aliasList = (this.options.resolve || {}).alias || {};
    let currentPreRenderModel = processPreRender(content, true);
    let replaceRegComponent = /component\s*=\s*\{(require|import)\(\s*(\/\*[^(\*\/)]*\*\/[^(\*\/)]\s*)*[\'\"]([^'")]*)[\'\"]\s*\);*\}/ig;
    let replaceRegRequire = /(require|import)\(\s*(\/\*[^(\*\/)]*\*\/[^(\*\/)]\s*)*[\'\"]([^'")]*)[\'\"]\s*\);*/;
    let data = (content.match(replaceRegComponent) || []);
    let moduleName = (options.asyncDefaultComponent && path.join(optionsContext, options.asyncDefaultComponent).replace(/\\/ig, '/') || path.join(__dirname, './asyncComponent.jsx').replace(/\\/ig, '/'));

    if (!options.asyncDefaultComponent) {
        throw 'please set current loader param: options -> { asyncDefaultComponent: "loading component path[base path = webpack.config -> context]" }';
    }

    //载入异步的Component
    content = `${content};require('${moduleName}')`;

    //缓存loading 界面与对应的逻辑
    cacheComponent[rootPath] = currentPreRenderModel;
    for (let i = 0, length = data.length; i < length; i++) {
        let temp = data[i] || '';
        let componentPropString = data[i];
        let requireString = (temp.match(replaceRegRequire) || [])[0];
        let loadContent = '';

        temp = requireString.replace(replaceRegRequire, '$3');

        if (!temp) {
            continue;
        }


        Object.keys(aliasList).forEach((key) => {
            let replacePath = aliasList[key];
            let aliasName = key;
            if (key && key[key.length - 1] === '$' && key == temp) {
                temp = `node_modules/${temp}/index.js`;
            } else if (key && temp.substr(0, key.length) === key) {
                temp = replacePath + temp.substr(key.length, temp.length);
            }
        });

        //是否携带盘符指定的绝对地址
        let absPath = temp[1] == ':' ? temp : path.join(resourcePath, temp);
        //检测后缀名
        if (absPath.indexOf('.') <= 0) {
            let extension = extensions.filter(x => fs.existsSync(`${absPath}.${x}`))[0];
            if (!extension) {
                throw 'webpack config -> resolve -> extensions is (.xx) not have file, please check or add your file extension';
            }
            absPath = `${absPath}.${extension}`;
        }

        try {
            loadContent = fs.readFileSync(absPath).toString();
        } catch (ex) {
            loadContent = '';
        }

        let preRenderCode = (cacheComponent[absPath] && cacheComponent[absPath].preRenderCode) || processPreRender(loadContent).preRenderCode;
        
        //替换为webpack2 的 import 变为动态载入
        let importString = requireString.replace('require', 'import');
        content = content.replace(requireString, `require('${moduleName}')(() => ${importString},() => { ${preRenderCode} })`)
    }
    return content;
};
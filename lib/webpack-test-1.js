var fs = require('fs')
var parser = require('@babel/parser')
var traverse = require('@babel/traverse').default
var path = require('path')
const {
    transformFromAst
} = require('@babel/core')
module.exports = class Webpack {
    constructor(options) {
        const {
            entry,
            output
        } = options
        this.entry = entry
        this.output = output
        this.modules = []
    }
    run() {
        // 入口分析
        const info = this.parse(this.entry)
        this.modules.push(info)
        // 遍历modules,处理其他的依赖
        for (var i = 0; i < this.modules.length; i++) {
            let item = this.modules[i]
            // console.log(item)
            const {
                dependencies
            } = item
            for (let j in dependencies) {
                this.modules.push(this.parse(dependencies[j]))
            }
        }
        // console.log(this.modules)
        // 转化为对象模式
        let obj = {}
        this.modules.forEach(item => {
            obj[item.entryFile] = {
                dependencies: item.dependencies,
                code: item.code
            }
        })
        // 处理依赖，生成main.js
        this.file(obj)
    }
    parse(entryFile) {
        // 获取内容
        const content = fs.readFileSync(entryFile, 'utf-8')
        // console.log(content)

        // 转化为AST(虚拟dom树)
        const ast = parser.parse(content, {
            sourceType: 'module'
        })
        // console.log(ast.program.body)
        let dependencies = {}
        // 拿到ast，提取依赖的路径
        traverse(ast, {
            ImportDeclaration({
                node
            }) {
                // 找到依赖，拼接依赖的完整路径
                // console.log(node.source.value)
                const newPathName = './' + path.join(path.dirname(entryFile), node.source.value)
                // console.log(newPathName)
                // 路径对应
                dependencies[node.source.value] = newPathName
                // console.log(dependencies)
            }
        })
        // 对ast代码加工
        const {
            code
        } = transformFromAst(ast, null, {
            presets: ['@babel/preset-env']
        })
        // console.log(code)
        return {
            code,
            dependencies,
            entryFile
        }

    }
    file(code) {
        // 拼接目录文件路径
        const pathName = path.join(this.output.path, this.output.filename)
        // console.log(pathName)
        const newCode = JSON.stringify(code)
        const bundle = `
        (function(graph){
            function require(moudle){
                function loaclrequire(relativePath){
                    return require(graph[moudle].dependencies[relativePath])
                }
                var exports = {};
                (function(require,exports,code){
                    eval(code)
                })(loaclrequire,exports,graph[moudle].code);
                return exports;
            }
            require('${this.entry}')
        })(${newCode})`
        if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist')
        }
        fs.writeFileSync(pathName, bundle, 'utf-8')
    }
}
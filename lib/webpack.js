const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const path = require('path')
const {
    transformFromAst
} = require('@babel/core')
module.exports = class Webpack {
    constructor(options) {
        // console.log(options)
        const {
            entry,
            output
        } = options
        // ./src/index.js
        this.entry = entry
        // output: {
        //     path: '/Users/songmengzhe/workspace/vue/simple-webpack/dist',
        //     filename: 'main.js'
        //   }        
        this.output = output
        this.modules = []
    }
    run() {
        // 入口分析,找到依赖
        const info = this.parse(this.entry)
        // console.log(info)
        // 处理依赖模块模块，做信息汇总
        this.modules.push(info)
        // console.log(this.modules)
        for (let i = 0; i < this.modules.length; i++) {
            const item = this.modules[i]
            const {
                dependencies
            } = item
            if (dependencies) {
                // console.log(dependencies)
                for (let j in dependencies) {
                    // 分析依赖模块，汇总到this.modules中（正常情况是不是应该递归调用，现在这样只能收集单层依赖）
                    this.modules.push(this.parse(dependencies[j]))
                }
            }
        }
        // console.log(this.modules)
        // 数组结构转换
        const obj = {}
        this.modules.forEach(item => {
            obj[item.entryFlie] = {
                dependencies: item.dependencies,
                code: item.code
            }
        })
        // console.log(obj)
        this.file(obj)
    }
    parse(entryFlie) {
        // 分析入口模块
        const content = fs.readFileSync(entryFlie, 'utf-8')
        // console.log(content)

        // 有哪些是依赖，分析依赖路径，生成AST
        // 通过parser.parse抽象成语法树，便于分析提取
        // ImportDeclaration引用
        // ExpressionStatement表达式
        const ast = parser.parse(content, {
            sourceType: 'module'
        })
        // console.log(ast)
        // console.log(ast.program.body)

        // {'./src/index.js':}
        const dependencies = {}
        // 提取路径
        traverse(ast, {
            ImportDeclaration({
                node
            }) {
                // console.log(node)
                // console.log(node.source.value) // ./expo.js=>./src/expo.js
                // console.log(path.dirname(entryFlie))
                const newPathName = './' + path.join(path.dirname(entryFlie), node.source.value)
                // console.log(newPathName)
                dependencies[node.source.value] = newPathName.replace('\\', '/')
                // console.log(dependencies)
            }
        })
        // 对代码加工,处理内容转换ast
        const {
            code
        } = transformFromAst(ast, null, {
            presets: ['@babel/preset-env']
        })
        // console.log(code)
        return {
            entryFlie,
            dependencies,
            code
        }
    }
    file(code) {
        // 生成bundLe.js => ./dist/main.js
        const filePath = path.join(this.output.path, this.output.filename)
        // console.log(filePath)
        const newCode = JSON.stringify(code)
        const bundle = `
        (function(graph){
            function require(module){
                function localRequire(relativePaht){
                    return require(graph[module].dependencies[relativePaht])
                }
                var exports = {};
                (function(require,exports,code){
                    eval(code);
                })(localRequire,exports,graph[module].code)
                return exports;
            }
            require('${this.entry}')
        })(${newCode})
        `
        if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist')
        }
        fs.writeFileSync(filePath, bundle, 'utf-8')
    }
}
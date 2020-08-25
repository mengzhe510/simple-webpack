const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const path = require('path')
const { transformFromAst } = require('@babel/core')
module.exports = class Webpack {
    constructor(options) {
        // console.log(options)
        const {
            entry,
            output
        } = options
        this.entry = entry
        this.output = output
        this.modules = []
    }
    run() {
        // console.log('hello webpack')
        const info = this.parse(this.entry)
        // console.log(info)
        // 处理其他模块，做信息汇总
        this.modules.push(info)
        for (let i = 0; i < this.modules.length; i++) {
            const item = this.modules[i]
            const { dependencies } = item
            if (dependencies) {
                for(let j in dependencies){
                    this.modules.push(this.parse(dependencies[j]))
                }
            }
        }
        // console.log(this.modules)
        // 数组结构转换
        const obj = {}
        this.modules.forEach(item=>{
            obj[item.entryFlie] = {
                dependencies:item.dependencies,
                code:item.code
            }
        })
        console.log(obj)
    }
    parse(entryFlie) {
        // 分析入口模块
        const content = fs.readFileSync(entryFlie, 'utf-8')
        // console.log(content)

        // 有哪些是依赖，分析依赖路径
        // 通过parse.parse抽象成语法树，便于分析提取
        // ImportDeclaration引用
        // ExpressionStatement表达式
        const ast = parser.parse(content, {
            sourceType: 'module'
        })
        // console.log(ast.program.body)

        const dependencies = {}
        // 提取路径
        traverse(ast, {
            ImportDeclaration({ node }) {
                // console.log(node.source.value) // ./expo.js=>./src/expo.js
                // console.log(path.dirname(entryFlie))
                const newPathName = './' + path.join(path.dirname(entryFlie), node.source.value)
                dependencies[node.source.value] = newPathName.replace('\\', '/')
                // console.log(dependencies)
            }
        })
        // 对代码加工,处理内容转换ast
        const { code } = transformFromAst(ast, null, {
            presets: ['@babel/preset-env']
        })
        // console.log(code)
        return {
            entryFlie,
            dependencies,
            code
        }
    }
}
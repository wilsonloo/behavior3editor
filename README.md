# 行为树编辑器(桌面版)
这是一个直观、可视化的行为树编辑器，行为树的保存格式为json，可以让策划自行去实现AI，技能，buff等复杂的游戏逻辑，从而减少不必要的沟通成本和提升开发效率。
![](readme/preview.png)

## 使用方法
+ 打开编辑器
+ 开始 -> 打开或新建项目
  * 项目根目录必须包含节点 json文件，json文件根节点必须含两个字段：
    * "type":"node_config" # 表示该json文件为 行为树各类型node 的配置文件
    * "list": [] # 表示具体的各类行为树节点名
  ```json
  {
    "type":"node_config",
    "list":[ 
      {"name":"AlwaysFail",...}, 
      {"name":"AlwaysSuccess",...},
      ...
    ]
  }
  ```
+ [ 可选：开始 -> 打开行为树目录 ]
  * 用来存储行为树的目录，默认为项目根目录
+ 开始 -> 新建行为树

## 示例项目
+ 项目: sample/project.json
+ 节点定义: sample/node-config.json
+ 行为树目录: sample/trees
+ 批处理脚本: sample/scripts

Tips: project.json也可以手动编辑,加上isRelative可以让配置中的路径变成相对路径，这样就不需要团队中每个人在使用前都必须先创建工作区

## 节点定义
```typescript
interface ArgsDefType {
  name: string, // 字段名
  type: string, // 字段类型
  desc: string, // 字段中文描述
}
interface BehaviorNodeTypeModel {
  name: string;         //节点名称
  type?: string;        //节点分类(Composite,Decorator,Condition,Action)
  desc?: string;        //节点说明
  args?: ArgsDefType[]; //参数列表
  input?: string[];     //输入变量名
  output?: string[];    //输出变量名
  doc?: string;         //文档说明(markdown格式)
}
```
节点定义也是json格式，参照[sample/node-config.json](sample/node-config.json)，编辑器不提供节点定义的编辑，强烈建议节点定义文件由代码生成 (参照示例项目[behavior3lua](https://github.com/zhandouxiaojiji/behavior3lua))。

## 编译与构建
* 注：目前只能支持到node.js v16+ 版本，v17及以上版本在运行 `npm start` 会出现 `ERR_OSSL_EVP_UNSUPPORTED` 报错
```shell
npm install # 安装依赖
npm start # 运行测试， 如果出现 `ERR_OSSL_EVP_UNSUPPORTED`, 
  # windows下输入 $env:NODE_OPTIONS="--openssl-legacy-provider"  
  #          或者 set NODE_OPTIONS=--openssl-legacy-provider， 
npm run dist # 编译exe可执行文件
```

## 技术栈
+ react + ts
+ electron
+ antd
+ g6

## 示例行为树框架
+ lua版本 [behavior3lua](https://github.com/zhandouxiaojiji/behavior3lua)
+ js/ts版本 计划中。

## TODO
+ 右键菜单
+ 面板拖拽新建节点
+ 变量自动补全
+ 设置面板
+ 禁止动画选项

## About
目前编辑器还处于非常简陋的阶段，有问题可以联系作者(QQ1013299930)，本项目将长期维护，望前端大佬们多提点~
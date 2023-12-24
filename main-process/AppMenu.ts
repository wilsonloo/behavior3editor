import {
    Menu,
    app,
    dialog,
    BrowserWindow,
    MenuItem,
    WebContents,
    MenuItemConstructorOptions,
} from "electron";
import * as fs from "fs";
import * as Path from "path";
import * as Utils from "../common/Utils";
import MainEventType from "../common/MainEventType";
import { MainProcess } from "./MainProcess";
import Settings from "./Settings";

const packageConf = require("../package.json");

export default class AppMenu {
    private mainProcess: MainProcess;
    private mainWindow: BrowserWindow;
    private webContents: WebContents;
    private settings: Settings;

    constructor(mainProcess: MainProcess) {
        this.mainProcess = mainProcess;
        this.mainWindow = mainProcess.mainWindow;
        this.webContents = mainProcess.mainWindow.webContents;
        this.settings = mainProcess.settings;
    }

    createMenu() {
        const menu: Menu = new Menu();
        menu.append(this.createStartMenu());
        menu.append(this.createEditMenu());
        menu.append(this.createNodeMenu());
        menu.append(this.createToolsMenu());
        return menu;
    }

    private createStartMenu() {
        const recentItems: MenuItemConstructorOptions[] = [];
        for (let path of this.settings.recentWorkspaces) {
            recentItems.push({
                label: path,
                click: () => {
                    console.log("open recent workspace", path);
                    openWorkspace(path);
                },
            });
        }
        const openWorkspace = (path: string) => {
            const curWorkspace = this.settings.curWorkspace;
            curWorkspace.setFilepath(path);
            curWorkspace.load();
            this.settings.pushRecentWorkspace(path);
            this.mainProcess.rebuildMenu();
            this.webContents.send(
                MainEventType.OPEN_DIR,
                curWorkspace.getWorkdir(),
                curWorkspace.getFilepath()
            );
        };
        const saveToNewPath = (callback?: any) => {
            (async () => {
                const res = await dialog.showSaveDialog({
                    properties: ["showOverwriteConfirmation"],
                    filters: [{ name: "Json", extensions: ["json"] }],
                });
                if (!res.canceled) {
                    this.settings.curWorkspace.setFilepath(res.filePath);
                    this.settings.curWorkspace.save();
                    openWorkspace(res.filePath);

                    if(callback){
                        callback();
                    }
                }
            })();
        };

        const get_node_config_files = (folder: string): string[] => {
            if (folder && folder != "" && fs.existsSync(folder)) {
                const files = fs.readdirSync(folder).filter((f) => {
                    return f.endsWith(".json");
                });
                console.debug("4444", files);
                let list: string[] = [];
                files.forEach((filename) => {
                    const fullPath = Path.join(folder, filename);
                    let node_cfg = JSON.parse(fs.readFileSync(fullPath, "utf8"));
                    if(node_cfg['type'] == "node_config"){
                        list.push(fullPath);
                    }
                })
                return list;
            }
        }

        const fileItems: MenuItemConstructorOptions[] = [];
        for (let path of this.settings.recentFiles) {
            fileItems.push({
                label: path,
                click: () => {
                    console.log("open recent file", path);
                },
            });
        }

        return new MenuItem({
            label: "开始",
            submenu: [
                {
                    label: "打开项目",
                    click: () => {
                        (async () => {
                            const res = await dialog.showOpenDialog({
                                properties: ["openFile"],
                                filters: [{ name: "Json", extensions: ["json"] }],
                            });
                            if (res.filePaths.length > 0) {
                                let workspaceDirPath = res.filePaths[0];
                                openWorkspace(workspaceDirPath);
                                this.webContents.send(
                                    MainEventType.OPEN_DIR,
                                    workspaceDirPath,
                                    this.settings.curWorkspace.getFilepath()
                                );
                            }
                        })();
                    },
                },
                {
                    label: "新建项目",
                    click: () => {
                        saveToNewPath(()=>{
                            let workspaceFilename = this.settings.curWorkspace.getFilepath();
                            let workspaceDirPath = Path.dirname(workspaceFilename);
                            let node_config_files = get_node_config_files(workspaceDirPath);
                            let node_config_file: string
                            if(node_config_files.length > 1){
                                node_config_file = node_config_files[0];
                                dialog.showMessageBox({
                                    type: "提示",
                                    buttons: ["ok"],
                                    message: "多个node-config,采用:"+node_config_file
                                });
                            }else if(node_config_files.length == 1) {
                                node_config_file = node_config_files[0];

                            }else if(node_config_files.length == 0){
                                node_config_file = Path.join(workspaceDirPath, "node_config.json");
                                let content = '{"type":"node_config", "list":[]}'
                                fs.writeFileSync(node_config_file, content, {
                                    flag: 'w',
                                })
                                console.log("default node config saved to ", node_config_file);
                            }

                            this.settings.curWorkspace.setWorkdir(workspaceDirPath);
                            this.settings.curWorkspace.setNodeConfPath(node_config_file);
                            this.settings.curWorkspace.save();
                            this.mainProcess.rebuildMenu();
                            this.settings.curWorkspace.save();
                            this.webContents.send(
                                MainEventType.OPEN_DIR,
                                workspaceDirPath,
                                this.settings.curWorkspace.getFilepath()
                            );
                        })
                    },
                },
                {
                    label: "保存项目",
                    click: () => {
                        if (this.settings.curWorkspace.getFilepath()) {
                            console.debug("saving cur:", this.settings.curWorkspace.getFilepath())
                            this.settings.curWorkspace.save();
                        } else {
                            console.debug("saving new")
                            saveToNewPath();
                        }
                    },
                },
                {
                    label: "项目另存为",
                    click: () => {
                        saveToNewPath();
                    },
                },
                {
                    label: "刷新项目",
                    accelerator: "F5",
                    click: () => {
                        console.log("reload workspace");
                        openWorkspace(this.settings.curWorkspace.getFilepath());
                    },
                },
                {
                    label: "最近打开",
                    submenu: recentItems,
                },
                { type: "separator" },
                
                // 以下为 行为树 相关##############################
                {
                    label: "打开行为树目录",
                    accelerator: "Ctrl+Shift+O",
                    click: () => {
                        if (!this.settings.curWorkspace.getNodeConfPath()) {
                            dialog.showErrorBox("警告", "请先指定节点定义配置!");
                            return;
                        }
                        (async () => {
                            const res = await dialog.showOpenDialog({
                                properties: ["openDirectory"],
                            });
                            if (res.filePaths.length > 0) {
                                const curWorkspace = this.settings.curWorkspace;
                                const path = res.filePaths[0];
                                curWorkspace.setWorkdir(path);
                                curWorkspace.save();
                                this.webContents.send(
                                    MainEventType.OPEN_DIR,
                                    path,
                                    curWorkspace.getFilepath()
                                );
                            }
                        })();
                    },
                },
                {
                    label: "新建行为树",
                    accelerator: "ctrl+n",
                    click: () => {
                        (async () => {
                            const res = await dialog.showSaveDialog({
                                properties: ["showOverwriteConfirmation"],
                                filters: [{ name: "Json", extensions: ["json"] }],
                            });
                            if (!res.canceled) {
                                const path = res.filePath;
                                fs.writeFileSync(
                                    path,
                                    JSON.stringify(Utils.createNewTree(path), null, 2)
                                );
                                this.webContents.send(MainEventType.CREATE_TREE, path);
                            }
                        })();
                    },
                },
                {
                    label: "打开行为树",
                    accelerator: "Ctrl+O",
                    click: () => {
                        (async () => {
                            const res = await dialog.showOpenDialog({
                                properties: ["openFile"],
                                filters: [{ name: "Json", extensions: ["json"] }],
                            });
                            if (res.filePaths.length > 0) {
                                const path = res.filePaths[0];
                                if (this.settings.recentFiles.indexOf(path) < 0) {
                                    this.settings.recentFiles.unshift(path);
                                    this.settings.save();
                                    this.mainProcess.rebuildMenu();
                                }
                                this.webContents.send(MainEventType.OPEN_FILE, path);
                            }
                        })();
                    },
                },
                {
                    label: "最近打开",
                    submenu: fileItems,
                },
                {
                    label: "保存行为树",
                    accelerator: "ctrl+s",
                    click: () => {
                        this.webContents.send(MainEventType.SAVE);
                    },
                },
                {
                    label: "全部保存行为树",
                    accelerator: "ctrl+shift+s",
                    click: () => {
                        this.webContents.send(MainEventType.SAVE_ALL);
                    },
                },
                {
                    label: "合并导出Json",
                    click: () => {
                        (async () => {
                            const res = await dialog.showSaveDialog({
                                properties: ["showOverwriteConfirmation"],
                                filters: [{ name: "Json", extensions: ["json"] }],
                            });
                            if (res.filePath) {
                                const curWorkspace = this.settings.curWorkspace;
                                curWorkspace.writeAllTrees(res.filePath, (err) => {
                                    const msg = err ? err : "导出成功";
                                    dialog.showMessageBox({
                                        type: "info",
                                        buttons: ["ok"],
                                        message: msg,
                                    });
                                });
                            }
                        })();
                    },
                },
                { type: "separator" },
                {
                    label: "关闭",
                    click: () => {
                        app.quit();
                    },
                },
            ],
        });
    }

    private createEditMenu() {
        return new MenuItem({
            label: "编辑",
            submenu: [
                {
                    label: "撤销",
                    accelerator: "ctrl+z",
                    click: () => {
                        this.webContents.send(MainEventType.UNDO);
                    }
                },
                {
                    label: "恢复",
                    accelerator: "ctrl+y",
                    click: () => {
                        this.webContents.send(MainEventType.REDO);
                    }
                },
                { type: "separator" },
                {
                    label: "新建节点",
                    accelerator: "insert",
                    click: () => {
                        this.webContents.send(MainEventType.CREATE_NODE, "unknow");
                    },
                },
                {
                    label: "删除节点",
                    accelerator: "delete",
                    click: () => {
                        this.webContents.send(MainEventType.DELETE_NODE);
                    },
                },
                { type: "separator" },
                {
                    label: "复制节点",
                    accelerator: "ctrl+c",
                    role: "copy",
                    click: () => {
                        this.webContents.send(MainEventType.COPY_NODE);
                    },
                },
                {
                    label: "粘贴节点",
                    accelerator: "ctrl+v",
                    click: () => {
                        this.webContents.send(MainEventType.PASTE_NODE);
                    },
                },
            ]
        })
    }

    private createToolsMenu() {
        const serverItems: MenuItemConstructorOptions[] = [];
        const curServerName = this.settings.serverName;
        for (let model of this.settings.curWorkspace.getServers()) {
            serverItems.push({
                label: `${model.name} ${model.host}`,
                type: 'checkbox',
                checked: curServerName == model.name,
                click: () => {
                    this.settings.serverName = model.name;
                    this.mainProcess.rebuildMenu();
                }
            })
        }
        return new MenuItem({
            label: "开发工具",
            submenu: [
                {
                    label: "热更",
                    accelerator: "Ctrl+R",
                    click: () => {
                        this.webContents.send(MainEventType.RELOAD_SERVER);
                    }
                },
                {
                    label: "联调服务器",
                    submenu: serverItems,
                },
                {
                    label: "批处理脚本",
                    click: () => {
                        (async () => {
                            const res = await dialog.showOpenDialog({
                                properties: ["openFile"],
                                filters: [{ name: "Javascript", extensions: ["js"] }],
                            });
                            if (res.filePaths.length > 0) {
                                this.webContents.send(MainEventType.BATCH_EXEC, res.filePaths[0]);
                            }
                        })();
                    }
                },
                {
                    type: 'separator',
                },
                {
                    label: "打开控制台",
                    accelerator: "Ctrl+Shift+I",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.toggleDevTools();
                    },
                },
                {
                    label: "重载编辑器",
                    click: (_, browserWindow) => {
                        browserWindow.reload();
                    },
                },
                {
                    type: 'separator',
                },
                {
                    label: `当前版本：${packageConf.version}`
                }
            ],
        });
    }

    private createNodeMenu() {
        const classifyItems: MenuItemConstructorOptions[] = [];
        const map: { [key: string]: MenuItemConstructorOptions } = {};
        for (let t of this.settings.nodeClassify) {
            let item: MenuItemConstructorOptions = {
                id: t.classify,
                label: `${t.classify}(${t.desc})`,
                submenu: [],
            };
            classifyItems.push(item);
            map[t.classify] = item;
        }
        const other: MenuItemConstructorOptions = {
            id: "other",
            label: "其它",
            submenu: [],
        };
        var hasOther = false;

        for (let node of this.settings.nodeConfig) {
            const item: MenuItemConstructorOptions = {
                label: `${node.name}(${node.desc})`,
                click: () => {
                    console.log("create node", node.name);
                    this.webContents.send(MainEventType.CREATE_NODE, node.name);
                },
            };
            let typeItem = map[node.type];
            if (!typeItem) {
                typeItem = other;
                hasOther = true;
            }
            if (typeItem.submenu instanceof Menu) {
                console.log("typeItem.submenu error", typeItem);
            } else {
                (typeItem.submenu as MenuItemConstructorOptions[]).push(item);
            }
        }

        if (hasOther) {
            classifyItems.push(other);
        }

        return new MenuItem({
            label: "新建节点",
            submenu: classifyItems,
        });
    }
}

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class SiteTreeDataProvider implements vscode.TreeDataProvider<SiteItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SiteItem | undefined | null | void> = new vscode.EventEmitter<SiteItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SiteItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private workspaceRoot: string;
    private treeData: SiteItem[] = [];
    
    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.refresh();
    }
    
    refresh(): void {
        this.treeData = this.buildTree(this.workspaceRoot);
        this._onDidChangeTreeData.fire();
    }
    
    getTreeData(): any {
        // Метод для экспорта данных дерева
        return this.treeData.map(item => item.toObject());
    }
    
    getTreeItem(element: SiteItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: SiteItem): Thenable<SiteItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('Нет открытого проекта');
            return Promise.resolve([]);
        }
        
        if (element) {
            return Promise.resolve(element.children);
        } else {
            return Promise.resolve(this.treeData);
        }
    }
    
    // Рекурсивная функция для построения дерева файлов
    private buildTree(dir: string): SiteItem[] {
        if (!fs.existsSync(dir)) {
            return [];
        }
        
        const files = fs.readdirSync(dir);
        let items: SiteItem[] = [];
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.lstatSync(fullPath);
            // Обрабатываем директории и файлы с расширениями .html, .css, .js
            if (stat.isDirectory()) {
                const children = this.buildTree(fullPath);
                const folderItem = new SiteItem(file, fullPath, vscode.TreeItemCollapsibleState.Collapsed, children);
                items.push(folderItem);
            } else if (/(.html|.css|.js)$/.test(file)) {
                const fileItem = new SiteItem(file, fullPath, vscode.TreeItemCollapsibleState.None);
                items.push(fileItem);
            }
        });
        return items;
    }
}

export class SiteItem extends vscode.TreeItem {
    public children: SiteItem[];
    
    constructor(
        public readonly label: string,
        public readonly fullPath: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        children: SiteItem[] = []
    ) {
        super(label, collapsibleState);
        this.children = children;
        this.tooltip = fullPath;
        this.description = '';
        // Устанавливаем иконку в зависимости от типа файла
        if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
            if (fullPath.endsWith('.html')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
            } else if (fullPath.endsWith('.css')) {
                this.iconPath = new vscode.ThemeIcon('symbol-color');
            } else if (fullPath.endsWith('.js')) {
                this.iconPath = new vscode.ThemeIcon('symbol-event');
            }
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
    
    toObject(): any {
        return {
            label: this.label,
            fullPath: this.fullPath,
            children: this.children ? this.children.map(child => child.toObject()) : []
        };
    }
}
